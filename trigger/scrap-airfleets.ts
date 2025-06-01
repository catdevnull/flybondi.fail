import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { sqlBuilder } from "../consts";
import fetchBuilder from "fetch-retry";
import { saveRawIntoB2 } from "../trigger-utils";
import * as cheerio from "cheerio";
import { ProxyAgent, fetch as undiciFetch, FormData } from "undici";
import fetchCookie from "fetch-cookie";

const fetch = fetchBuilder(fetchCookie(undiciFetch));
let dispatcher = (process.env.PROXY_URL && genDispatcher()) || undefined;

function genDispatcher() {
  return new ProxyAgent({
    uri: process.env.PROXY_URL!,
    keepAliveTimeout: 180e3,
    connectTimeout: 10e3,
    bodyTimeout: 15e3,
  });
}
const sql = sqlBuilder();

export const scrapMatriculasTask = schemaTask({
  id: "scrap-matriculas",
  maxDuration: 6000,
  run: async (payload, { ctx }) => {
    const matriculas = await sql<{ matricula: string }[]>`
    select distinct json->>'matricula' as matricula
    from aerolineas_latest_flight_status 
    where json->>'matricula' not in (select matricula from airfleets_matriculas);
    `;

    const fetched_at = new Date();

    logger.info(`Trying to fetch ${matriculas.length} matriculas`);

    for (const { matricula } of matriculas) {
      try {
        await scrapMatricula(matricula, fetched_at);
      } catch (e) {
        logger.error("Error scraping matricula", { matricula, error: e });
      }
    }
  },
});

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Cache-Control": "max-age=0",
};

async function scrapMatricula(matricula: string, fetched_at: Date) {
  logger.info(`Searching for ${matricula}`);
  const searchUrl =
    "https://www.airfleets.es/recherche/?key=" + matricula.trim();
  const searchHtml = await fetchAirfleets(searchUrl);
  if (searchHtml === 404) {
    logger.warn(`404 encontrado para ${matricula}, skipping`);
    return;
  }
  await saveRawIntoB2({ body: searchHtml, fetched_at, url: searchUrl });
  const $ = cheerio.load(searchHtml);
  const table = $("div.ten.columns.padgauche > table:nth-of-type(1)");
  const aeronave = table.find(".tabcontent > td:nth-of-type(1)").text();
  const msn = table.find(".tabcontent > td:nth-of-type(3)").text();
  const compania_aerea = table.find(".tabcontent > td:nth-of-type(4)").text();
  const situacion = table.find(".tabcontent > td:nth-of-type(5)").text();

  let detail_url = new URL(
    $(".tabcontent > td:nth-of-type(1) .lien").attr("href")!,
    searchUrl
  ).toString();
  // inexplicablemente a veces tienen urls mal
  detail_url = detail_url.replace(" ", "").replace("%20", "");

  const detailHtml = await fetchAirfleets(detail_url);
  if (detailHtml === 404) {
    logger.warn(`404 encontrado para ${matricula}, skipping`);
    return;
  }
  await saveRawIntoB2({ body: detailHtml, fetched_at, url: detail_url });
  const detail$ = cheerio.load(detailHtml);

  const edad_del_avion_str = detail$("tr")
    .filter(function () {
      return $(this).text().includes("Edad del");
    })
    .find(".texten:nth-of-type(2)")
    .text()
    .trim();
  const edad_del_avion = parseFloat(
    edad_del_avion_str.match(/[\d.]+/)?.[0] ?? "0"
  );

  const config_de_asientosEl = detail$("tr")
    .filter(function () {
      return $(this).text().includes("Config de asientos");
    })
    .find(".texten:nth-of-type(2)");
  config_de_asientosEl.find("span").remove();
  const config_de_asientos = config_de_asientosEl.text().trim();

  await sql`
      insert into airfleets_matriculas
      (fetched_at, matricula, aeronave, msn, compania_aerea, situacion, detail_url, edad_del_avion, config_de_asientos)
      values (${fetched_at}, ${matricula}, ${aeronave}, ${msn}, ${compania_aerea}, ${situacion}, ${detail_url}, ${edad_del_avion}, ${config_de_asientos})
      `;
  logger.info(`Inserted ${matricula}`, {
    fetched_at,
    matricula,
    aeronave,
    msn,
    compania_aerea,
    situacion,
    detail_url,
    edad_del_avion,
    config_de_asientos,
  });
}

async function fetchAirfleets(url: string | URL, captchaAttempts = 0) {
  const res = await fetch(url, {
    headers,
    redirect: "manual",
    dispatcher,
  });
  if (res.status === 302) {
    if (res.headers.get("location")?.includes("captcha.php")) {
      if (captchaAttempts > 3) {
        logger.info("too many captchas, cambiando proxy...", { url });
        dispatcher = genDispatcher();
        return await fetchAirfleets(url);
      }
      logger.info("Captcha detectado, resolviendo...", { url });
      const captchaUrl = "https://www.airfleets.es/home/captcha.php";
      const res = await fetch(captchaUrl, {
        headers,
        dispatcher,
      });
      const html = await res.text();
      const $ = cheerio.load(html);
      const websiteKey = $(".g-recaptcha").attr("data-sitekey");
      if (!websiteKey) {
        console.log(html);
        logger.debug("Debug info", {
          html,
          status: res.status,
          headers: Array.from(res.headers.entries()),
        });
        throw new Error("No websiteKey found");
      }
      const code = await solveRecaptchaV2({
        websiteKey,
        websiteURL: captchaUrl,
      });
      const form = new FormData();
      form.append("g-recaptcha-response", code);
      form.append("org", url.toString());
      await fetch("https://www.airfleets.es/home/captcha2.php", {
        method: "POST",
        body: form,
        headers,
        dispatcher,
      });
      return await fetchAirfleets(url, captchaAttempts + 1);
    }
  }
  if (res.status !== 200) {
    if (res.status === 429) {
      logger.debug("Got ratelimited, changing proxy...", {
        url,
        headers: Array.from(res.headers.entries()),
      });
      await dispatcher?.destroy();
      dispatcher = genDispatcher();
      return await fetchAirfleets(url);
    }
    if (res.status === 404) return 404;
    logger.error("Debug data", {
      status: res.status,
      headers: Array.from(res.headers.entries()),
      url,
    });
    throw new Error(`got status ${res.status}`);
  }
  const html = await res.text();
  return html;
}

async function solveRecaptchaV2({
  websiteURL,
  websiteKey,
}: {
  websiteURL: string;
  websiteKey: string;
}) {
  const res = await fetch("https://api.2captcha.com/createTask", {
    method: "POST",
    body: JSON.stringify({
      clientKey: process.env.TWOCAPTCHA_API_KEY,
      task: {
        type: "RecaptchaV2TaskProxyless",
        websiteURL,
        websiteKey,
        isInvisible: false,
      },
    }),
  });
  const task: any = await res.json();

  while (true) {
    const res = await fetch("https://api.2captcha.com/getTaskResult", {
      method: "POST",
      body: JSON.stringify({
        clientKey: process.env.TWOCAPTCHA_API_KEY,
        taskId: task.taskId,
      }),
    });
    const taskResult: any = await res.json();
    if (taskResult.status === "ready") {
      logger.debug("Got solved recaptcha", { taskResult });
      return taskResult.solution.gRecaptchaResponse;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
