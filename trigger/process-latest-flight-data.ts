import { logger, schedules } from "@trigger.dev/sdk/v3";
import { b2, B2_BUCKET, B2_PATH, sql } from "../consts";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { AerolineasFlightData } from "../misc/aerolineas";
import { z } from "zod";
import PQueue from "p-queue";

export const processLatestFlightDataTask = schedules.task({
  id: "process-latest-flight-data",
  cron: "2 * * * *",
  maxDuration: 6000,
  run: async (payload, { ctx }) => {
    async function processJson(path: string) {
      const response = await b2.send(
        new GetObjectCommand({
          Bucket: B2_BUCKET,
          Key: path,
        })
      );
      const json = await response.Body?.transformToString();
      if (!json) throw new Error("No data");
      const obj = JSON.parse(json);
      const result = z.array(AerolineasFlightData).safeParse(obj);
      if (!result.success) {
        logger.warn("Failed to parse FlightData", {
          error: result.error,
          path,
        });
        return;
      }
      const { airport, direction, flightDate, fetchedAt } = parsePath(path);
      for (const status of result.data) {
        await sql`
  INSERT INTO aerolineas_latest_flight_status (aerolineas_flight_id, last_updated, json)
  VALUES (${status.id}, ${fetchedAt.toISOString()}, ${JSON.stringify(status)})
  ON CONFLICT (aerolineas_flight_id) 
  DO UPDATE SET last_updated = ${fetchedAt.toISOString()}, json = ${JSON.stringify(
          status
        )}
  `;
      }
    }

    const list = await b2.send(
      new ListObjectsV2Command({
        Bucket: B2_BUCKET,
        Prefix: B2_PATH,
      })
    );
    const queue = new PQueue({ concurrency: 50 });
    const tasks = (list.Contents || [])
      .filter(
        (item): item is { Key: string } =>
          (item.Key?.includes("webaa-api") &&
            item.Key?.includes("all-flights")) ||
          false
      )
      .filter(({ Key }) => {
        const { fetchedAt } = parsePath(Key);
        if (payload.lastTimestamp && fetchedAt <= payload.lastTimestamp)
          return false;
        return true;
      })
      .map(({ Key }) => async () => {
        logger.info("Processing", { Key });
        await processJson(Key);
      });
    logger.info(`Processing ${tasks.length} files`);

    await queue.addAll(tasks);
  },
});

function parsePath(path: string) {
  const [env, timestamp, type, url] = path.split("/");
  const fetchedAt = new Date(timestamp);
  if (type !== "raw") throw new Error("Invalid type");

  const urlParams = new URLSearchParams(url.split("?")[1]);
  const idarpt = urlParams.get("idarpt"); // VDM
  const movtp = urlParams.get("movtp"); // A
  const [flightDate] = (urlParams.get("f") || "").split(","); // 24-12-2024

  return {
    airport: idarpt,
    direction: movtp,
    flightDate: flightDate
      ? new Date(flightDate.split("-").reverse().join("-"))
      : null,
    fetchedAt,
  };
}
