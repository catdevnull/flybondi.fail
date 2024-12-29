import { logger, schedules } from "@trigger.dev/sdk/v3";
import { b2, B2_BUCKET, B2_PATH, B2_REGION, db } from "../consts";
import { _Object, ListObjectsV2Command } from "@aws-sdk/client-s3";
import PQueue from "p-queue";

export const processLatestFlightDataTask = schedules.task({
  id: "process-latest-flight-data",
  cron: "2 * * * *",
  maxDuration: 6000,
  machine: { preset: "medium-1x" },
  run: async (payload, { ctx }) => {
    const conn = await db.connect();
    async function processJson(path: string) {
      const { airport, direction, flightDate, fetchedAt } = parsePath(path);
      const publicUrl = getPublicB2Url(path);
      const q = conn.exec(
        `
        INSERT INTO aerolineas_latest_flight_status (aerolineas_flight_id, last_updated, json)
        SELECT DISTINCT ON(aerolineas_flight_id) json->>'$.id' as aerolineas_flight_id, ${fetchedAt.toISOString()} as last_updated, json
        FROM read_json_auto(${publicUrl})
        ON CONFLICT (aerolineas_flight_id) 
        DO UPDATE SET last_updated = EXCLUDED.last_updated, json = EXCLUDED.json
        `,
        fetchedAt.toISOString(),
        publicUrl
      );
      await q;
    }

    const list = await getAllObjectsFromS3Bucket(B2_BUCKET, B2_PATH);
    const queue = new PQueue({ concurrency: 50 });
    const tasks = list
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
      .map(({ Key }) => async () => {
        logger.info("Processing", { Key, url: getPublicB2Url(Key) });
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
