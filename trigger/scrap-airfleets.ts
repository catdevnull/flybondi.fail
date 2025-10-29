import { logger, schemaTask } from "@trigger.dev/sdk";
import { sqlBuilder } from "../consts";
import fetchBuilder from "fetch-retry";
import { saveRawIntoB2 } from "../trigger-utils";
import * as cheerio from "cheerio";

const fetch = fetchBuilder(globalThis.fetch);
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
//console.log(await scrapMatricula("CCBFB", new Date()));
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

  if (!config_de_asientos && !compania_aerea) {
    logger.warn(`No data found for ${matricula}, skipping`, {
      matricula,
      aeronave,
      msn,
      compania_aerea,
      situacion,
    });
    return;
  }

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

async function fetchAirfleets(url: string | URL): Promise<string | 404> {
  try {
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zone: process.env.BRIGHTDATA_ZONE || "web_unlocker1",
        url: url.toString(),
        format: "raw",
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return 404;
      }
      const errorText = await response.text();
      logger.error("Bright Data API error", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: url.toString(),
      });
      throw new Error(
        `Bright Data API error: ${response.status} ${response.statusText}`
      );
    }
    if (response.headers.get("x-brd-err-code"))
      throw new Error(
        `Bright Data API error: ${response.headers.get(
          "x-brd-err-code"
        )} ${response.headers.get("x-brd-err-msg")}`
      );
    const data = await response.text();
    if (data.trim().length === 0) {
      throw new Error("Empty response from Bright Data");
    }
    return data;
  } catch (error) {
    logger.error("Error fetching with Bright Data", {
      url: url.toString(),
      error: error.message,
    });
    throw error;
  }
}
