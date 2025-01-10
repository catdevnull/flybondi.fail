import { logger, schedules } from "@trigger.dev/sdk/v3";
import { b2, B2_BUCKET, B2_PATH, B2_REGION, sqlBuilder } from "../consts";
import {
  _Object,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import PQueue from "p-queue";
import { basename } from "path";

export const processLatestFlightDataTask = schedules.task({
  id: "process-latest-flight-data",
  cron: "2 * * * *",
  maxDuration: 6000,
  run: async (payload, { ctx }) => {
    const sql = sqlBuilder();

    const list = await getAllObjectsFromS3Bucket(B2_BUCKET, B2_PATH);
    const queue = new PQueue({ concurrency: 4 });
    const tasks = Array.from(
      list
        .filter((item) => item.Size && item.Size > 2) // filter out empty JSON arrays
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
        .reduce((acc, { Key }) => {
          const { fetchedAt } = parsePath(Key);
          const timestamp = fetchedAt.getTime();
          acc.set(timestamp, (acc.get(timestamp) || []).concat(Key));
          return acc;
        }, new Map<number, string[]>())
        .entries()
    ).map(([_timestamp, keys]) => async () => {
      const key = parsePath(keys[0]);
      const path = `${B2_PATH}/${key.fetchedAt.toISOString()}/raw/`;
      logger.info("Processing", { path, urls: keys.map(getPublicB2Url) });

      const allJsonAlreadyExists = list.find(
        (item) => item.Key === `${path}all-keys.json`
      );
      let allEntriesWithKeys;
      if (allJsonAlreadyExists) {
        const { Body } = await b2.send(
          new GetObjectCommand({
            Bucket: B2_BUCKET,
            Key: `${path}all-keys.json`,
          })
        );
        if (!Body) throw new Error("No body");
        allEntriesWithKeys = JSON.parse(await Body.transformToString());
      } else {
        allEntriesWithKeys = Object.fromEntries(
          await Promise.all(
            keys.map(async (key) => {
              const { Body } = await b2.send(
                new GetObjectCommand({
                  Bucket: B2_BUCKET,
                  Key: key,
                })
              );
              if (!Body) throw new Error("No body");
              return [key, JSON.parse(await Body.transformToString())];
            })
          )
        );
        await b2.send(
          new PutObjectCommand({
            Bucket: B2_BUCKET,
            Key: `${path}all-keys.json`,
            Body: JSON.stringify(allEntriesWithKeys),
          })
        );
        logger.info("Stored all-keys.json", {
          path,
          url: getPublicB2Url(`${path}all-keys.json`),
        });
      }

      const allEntries = Object.entries(allEntriesWithKeys)
        .map(([key, value]) => {
          const { flightDate } = parsePath(key);
          return (value as any).map((v) => ({
            ...v,
            x_date: flightDate,
          }));
        })
        .flat();

      await sql`
      INSERT INTO aerolineas_latest_flight_status (aerolineas_flight_id, last_updated, json)
      SELECT DISTINCT ON(aerolineas_flight_id) value->>'id' as aerolineas_flight_id, ${key.fetchedAt} as last_updated, value as json
      FROM json_array_elements(${allEntries}) as value
      ON CONFLICT (aerolineas_flight_id) 
      DO UPDATE SET last_updated = EXCLUDED.last_updated, json = EXCLUDED.json
      WHERE EXCLUDED.last_updated >= aerolineas_latest_flight_status.last_updated
      `;
    });

    logger.info(`Processing ${tasks.length} collections`);

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
    flightDate: flightDate ? flightDate.split("-").reverse().join("-") : null,
    fetchedAt,
  };
}
function getPublicB2Url(path: string) {
  const split = path.split("?");
  return `https://${B2_BUCKET}.s3.${B2_REGION}.backblazeb2.com/${split[0]}${
    split[1] ? encodeURIComponent(`?${split[1]}`) : ""
  }`;
}

async function getAllObjectsFromS3Bucket(bucket: string, prefix: string) {
  let isTruncated = true;
  let continuationToken: string | undefined;
  const objects: { Key: string; Size?: number }[] = [];

  while (isTruncated) {
    const response = await b2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    if (response.Contents) {
      objects.push(
        ...response.Contents.filter(
          (item): item is { Key: string } => item.Key !== undefined
        )
      );
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }

  return objects;
}
