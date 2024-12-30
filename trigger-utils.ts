import { logger } from "@trigger.dev/sdk/v3";
import { b2, B2_BUCKET, B2_PATH } from "./consts";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function saveRawIntoB2({
  url,
  body,
  fetched_at,
}: {
  url: string;
  body: string;
  fetched_at: Date;
}) {
  const datetime = fetched_at.toISOString();
  const path = urlToPath(url);
  const key = `${B2_PATH}/${datetime}/raw/${path}`;
  await b2.send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: body,
    })
  );
  logger.debug(`Stored raw response into B2`, { url, key });
  return key;
}

export function urlToPath(url: string) {
  return url.replace(/https?:\/\//, "").replace(/\//g, "__");
}
