import { logger, schedules, schemaTask } from "@trigger.dev/sdk";
import {
  AerolineasSnapshot,
  FlightstatsSnapshot,
  FlightstatsSnapshotEntries,
  FlightstatsSnapshotEntry,
} from "../consts";
import * as cheerio from "cheerio";
import { format, parse, sub } from "date-fns";
import { tz } from "@date-fns/tz";
import AEROLINEAS_AIRPORTS_JSON from "../misc/aerolineas-airports.json";
import { z } from "zod";
import { AerolineasFlightData } from "../misc/aerolineas";
import fetchBuilder from "fetch-retry";
import PQueue from "p-queue";
import { saveRawIntoB2 } from "../trigger-utils";

const AEROLINEAS_AIRPORTS = AEROLINEAS_AIRPORTS_JSON.data.map((a) => a.iata);

const fetch = fetchBuilder(globalThis.fetch);

export const scrapAerolineasTask = schemaTask({
  id: "scrap-aerolineas",
  maxDuration: 6000,
  schema: z.object({
    date: z.coerce.date(),
  }),
  run: async (payload, { ctx }) => {
    const queue = new PQueue({ concurrency: 5 });
    const fetched_at = new Date();

    for (const airport_iata of AEROLINEAS_AIRPORTS) {
      queue.add(async () => {
        for (const movtp of ["D", "A"]) {
          logger.info(`Fetching Aerolineas data`, {
            date: payload.date,
            airport_iata,
            movtp,
          });
          const url = `https://webaa-api-h4d5amdfcze7hthn.a02.azurefd.net/web-prod/v1/api-aa/all-flights?c=900&idarpt=${airport_iata}&movtp=${movtp}&f=${format(
            payload.date,
            "dd-MM-yyyy",
            { in: tz("America/Argentina/Buenos_Aires") }
          )}`;
          const res = await fetch(url, {
            headers: {
              Origin: "https://www.aeropuertosargentina.com",
              Key: "HieGcY2nFreIsNLuo5EbXCwE7g0aRzTN",
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
              "Accept-Language": "es-AR",
            },
            retryOn: (attempt, error, response) => {
              if (error !== null || (response?.status ?? 0) >= 400) {
                logger.warn(`retrying, attempt number ${attempt + 1}`);
                return true;
              }
              return false;
            },
            retries: 5,
            retryDelay: (attempt) => Math.pow(2, attempt) * 1000,
          });
          const json = await res.json();
          logger.debug(`Fetched URL`, { url, status: res.status });

          const b2_raw_path = await saveRawIntoB2({
            url,
            body: JSON.stringify(json),
            fetched_at,
          });
          const datas = z.array(AerolineasFlightData).parse(json);

          const snapshot: AerolineasSnapshot = {
            airport_iata,
            b2_raw_path,
            fetched_at,
            date: payload.date,
            flights_relative_to_airport:
              movtp === "D" ? "departures" : "arrivals",
            url,
            entries: datas,
          };

          // const columns = sql.identifier([
          //   "url",
          //   "fetched_at",
          //   "b2_raw_path",
          //   "airport_iata",
          //   "flights_relative_to_airport",
          //   "date",
          //   "entries",
          // ]);
          // const values = sql.values([
          //   [
          //     snapshot.url,
          //     snapshot.fetched_at,
          //     snapshot.b2_raw_path,
          //     snapshot.airport_iata,
          //     snapshot.flights_relative_to_airport,
          //     snapshot.date,
          //     JSON.stringify(snapshot.entries),
          //   ],
          // ]);
          // await sql`insert into aerolineas_snapshots (${columns}) values ${values}`;
        }
      });
    }
    await queue.onIdle();
  },
});

export const scrapAerolineasCronTask = schedules.task({
  id: "scrap-aerolineas-cron",
  cron: "59 1,2,5,10,15,20,22,23 * * *",
  maxDuration: 300,
  run: async (payload, { ctx }) => {
    await scrapAerolineasTask.trigger({
      date: new Date(),
    });
    await scrapAerolineasTask.trigger({
      date: sub(new Date(), { days: 1 }),
    });
  },
});

// export const scrapFlightstatsTask = schedules.task({
//   id: "scrap-flightstats",
//   cron: "0 * * * *",
//   maxDuration: 300,
//   run: async (payload, { ctx }) => {
//     const datetime = new Date().toISOString();
//     const url = `https://flightstats.londonsupplygroup.com/partidas-REL`;

//     const res = await fetch(url);
//     const text = await res.text();
//     logger.debug(`Fetched URL`, { url, status: res.status });
// await saveHtmlIntoB2({html:text, fetched_at: new Date(), url});

//     logger.log(JSON.stringify(await sql`select 1`));
//   },
// });
function parseFlightstatsHtml({
  html,
  url,
  fetched_at,
  b2_raw_path,
}: {
  html: string;
  url: string;
  fetched_at: Date;
  b2_raw_path: string;
}): FlightstatsSnapshot {
  const airport_iata = url.match(/-([A-Z]{3,4})$/)?.[1];
  if (!airport_iata)
    throw new Error(`Could not parse airport IATA from URL: ${url}`);

  const flights_relative_to_airport = url.includes("/arribos-")
    ? "arrivals"
    : url.includes("partidas")
    ? "departures"
    : (() => {
        throw new Error("yeah yeah");
      })();

  const $ = cheerio.load(html);

  let last_updated_at: Date;
  {
    const dateInfo = $(".inf-act.hidden-xs");
    dateInfo.find("div").remove();
    const str = dateInfo.text().match("(d{2}:d{2})hs")?.[1];
    if (!str) throw new Error("Couldn't get last_updated_at");
    last_updated_at = parse(str, "HH:mm", new Date(), {
      in: tz("America/Argentina/Buenos_Aires"),
    });
  }

  const entries: FlightstatsSnapshotEntries = [];
  $("li.dl").each((i, tr) => {
    const tds = $(tr).find("td");
    if (tds.length === 0) return;
    const entry: FlightstatsSnapshotEntry = {
      aerolinea: $(tds[0]).text().trim(),
      vuelo: $(tds[1]).text().trim(),
      aeropuertoIata: $(tds[2]).text().trim(),
      partida: $(tds[3]).text().trim(),
      status: $(tds[4]).text().trim(),
      gate: $(tds[5]).text().trim(),
    };
    entries.push(entry);
  });

  return {
    url,
    fetched_at,
    b2_raw_path,
    airport_iata,
    flights_relative_to_airport,
    last_updated_at,
    date: new Date(),
    entries,
  };
}
