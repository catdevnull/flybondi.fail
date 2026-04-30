import { logger, schedules, usage } from "@trigger.dev/sdk/v3";
import { b2, B2_BUCKET, B2_PATH, B2_REGION, sqlBuilder } from "../consts";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import PQueue from "p-queue";
import pMap from "p-map";

const COLLECTION_CONCURRENCY = 4;
const OBJECT_FETCH_CONCURRENCY = 12;

export const processLatestFlightDataTask = schedules.task({
  id: "process-latest-flight-data",
  cron: "2 */3 * * *",
  maxDuration: 1800,
  machine: "small-1x",
  queue: {
    concurrencyLimit: 1,
  },
  run: async () => {
    const sql = sqlBuilder();
    const lastProcessedAt = await getLatestProcessedAt(sql);
    const startAfter = buildStartAfterKey(lastProcessedAt);
    const { result: list, compute: listCompute } = await usage.measure(() =>
      getAllObjectsFromS3Bucket(B2_BUCKET, `${B2_PATH}/`, startAfter)
    );
    const collections = Array.from(
      list
        .filter((item) => item.Size && item.Size > 2) // filter out empty JSON arrays
        .filter(
          (item): item is { Key: string } =>
            item.Key?.includes("webaa-api") &&
            item.Key?.includes("all-flights") === true
        )
        .reduce((acc, { Key }) => {
          const { fetchedAt } = parsePath(Key);
          const timestamp = fetchedAt.getTime();
          acc.set(timestamp, (acc.get(timestamp) || []).concat(Key));
          return acc;
        }, new Map<number, string[]>())
        .entries()
    );

    logger.info("Collected raw Aerolineas snapshots to process", {
      lastProcessedAt: lastProcessedAt?.toISOString() ?? null,
      startAfter,
      objectCount: list.length,
      collectionCount: collections.length,
      collectionConcurrency: COLLECTION_CONCURRENCY,
      objectFetchConcurrency: OBJECT_FETCH_CONCURRENCY,
      listCompute,
    });

    if (collections.length === 0) {
      logger.info("No new raw Aerolineas snapshots to process", {
        totalUsage: usage.getCurrent(),
      });
      return;
    }

    const queue = new PQueue({ concurrency: COLLECTION_CONCURRENCY });

    await queue.addAll(
      collections.map(([, keys]) => async () => {
        const key = parsePath(keys[0]);
        const path = `${B2_PATH}/${key.fetchedAt.toISOString()}/raw/`;
        logger.info("Processing collection", {
          path,
          objectCount: keys.length,
          urls: keys.map(getPublicB2Url),
        });

        const { result: allEntries, compute: fetchCompute } = await usage.measure(
          async () => {
            const values = await pMap(
              keys,
              async (key) => {
                const response = await b2.send(
                  new GetObjectCommand({
                    Bucket: B2_BUCKET,
                    Key: key,
                  })
                );
                const text = await response.Body?.transformToString();
                return [key, JSON.parse(text!)] as const;
              },
              { concurrency: OBJECT_FETCH_CONCURRENCY }
            );

            return values
              .map(([key, value]) => {
                const { flightDate } = parsePath(key);
                return (value as any[]).map((v) => ({
                  ...v,
                  x_date: flightDate,
                }));
              })
              .flat();
          }
        );

        const { compute: upsertCompute } = await usage.measure(async () => {
          await sql`
          INSERT INTO aerolineas_latest_flight_status (aerolineas_flight_id, last_updated, json)
          SELECT DISTINCT ON(aerolineas_flight_id) value->>'id' as aerolineas_flight_id, ${key.fetchedAt} as last_updated, value as json
          FROM json_array_elements(${allEntries}) as value
          ON CONFLICT (aerolineas_flight_id) 
          DO UPDATE SET last_updated = EXCLUDED.last_updated, json = EXCLUDED.json
          WHERE EXCLUDED.last_updated >= aerolineas_latest_flight_status.last_updated
          `;
        });

        logger.info("Processed collection", {
          path,
          objectCount: keys.length,
          entryCount: allEntries.length,
          fetchCompute,
          upsertCompute,
        });
      })
    );

    logger.info("Finished processing latest flight data", {
      collectionCount: collections.length,
      totalUsage: usage.getCurrent(),
    });
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

async function listObjectsPage(
  bucket: string,
  prefix: string,
  {
    continuationToken,
    startAfter,
  }: { continuationToken?: string; startAfter?: string } = {}
): Promise<{ objects: { Key: string; Size?: number }[]; nextToken?: string }> {
  const response = await b2.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      StartAfter: continuationToken ? undefined : startAfter,
    })
  );

  const objects = (response.Contents || []).filter(
    (item): item is { Key: string; Size?: number } => item.Key !== undefined
  );

  return {
    objects,
    nextToken: response.IsTruncated
      ? response.NextContinuationToken
      : undefined,
  };
}

async function getAllObjectsFromS3Bucket(
  bucket: string,
  prefix: string,
  startAfter?: string
) {
  const allObjects: { Key: string; Size?: number }[] = [];
  let continuationToken: string | undefined;

  while (true) {
    const { objects, nextToken } = await listObjectsPage(bucket, prefix, {
      continuationToken,
      startAfter,
    });
    allObjects.push(...objects);

    if (!nextToken) {
      return allObjects;
    }

    continuationToken = nextToken;
    startAfter = undefined;
  }
}

async function getLatestProcessedAt(sql: ReturnType<typeof sqlBuilder>) {
  const [row] = await sql<{ last_updated: Date | string | null }[]>`
    SELECT MAX(last_updated) AS last_updated
    FROM aerolineas_latest_flight_status
  `;

  if (!row?.last_updated) {
    return null;
  }

  return new Date(row.last_updated);
}

function buildStartAfterKey(lastProcessedAt: Date | null) {
  if (!lastProcessedAt) {
    return undefined;
  }

  return `${B2_PATH}/${new Date(lastProcessedAt.getTime() - 1).toISOString()}`;
}
