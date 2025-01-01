import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { AerolineasFlightData } from "./misc/aerolineas";
import postgres from "postgres";

const { NODE_ENV } = process.env;

export const PROD = NODE_ENV === "production";
export const NOT_PROD = !PROD;
export const sqlBuilder = () =>
  postgres(process.env.PG_URL!, { prepare: false });

export const B2_REGION = "us-west-004";
export const b2 = new S3Client({
  endpoint: `https://s3.${B2_REGION}.backblazeb2.com`,
  region: B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID || "",
    secretAccessKey: process.env.B2_APP_KEY || "",
  },
});
export const B2_BUCKET = "flybondi-fail";
export const B2_PATH = PROD ? "prod" : "dev";

export const FlightstatsSnapshotEntry = z.object({
  aerolinea: z.string(),
  vuelo: z.string(),
  aeropuertoIata: z.string(), // origen o destino
  partida: z.string(),
  status: z.string(),
  gate: z.string().optional(),
});
export type FlightstatsSnapshotEntry = z.infer<typeof FlightstatsSnapshotEntry>;
export const FlightstatsSnapshotEntries = z.array(FlightstatsSnapshotEntry);
export type FlightstatsSnapshotEntries = z.infer<
  typeof FlightstatsSnapshotEntries
>;
export const FlightstatsSnapshot = z.object({
  url: z.string(),
  fetched_at: z.date(),
  b2_raw_path: z.string(),
  airport_iata: z.string(),
  flights_relative_to_airport: z.enum(["departures", "arrivals"]),
  last_updated_at: z.date().nullable(),
  date: z.date(),
  entries: FlightstatsSnapshotEntries,
});
export type FlightstatsSnapshot = z.infer<typeof FlightstatsSnapshot>;

export const AerolineasSnapshot = z.object({
  url: z.string(),
  fetched_at: z.date(),
  b2_raw_path: z.string(),
  airport_iata: z.string(),
  flights_relative_to_airport: z.enum(["departures", "arrivals"]),
  date: z.date(),
  entries: z.array(AerolineasFlightData),
});
export type AerolineasSnapshot = z.infer<typeof AerolineasSnapshot>;

// Node no incluye los certificados intermedios y los idiotas de londonsupplygroup no los incluyen los fullchain en su servidor
// Tenemos que agregarlos manualmente

// https://github.com/fujifish/syswide-cas/blob/master/index.js
import fs from "fs";
import path from "path";
import tls from "tls";

const rootCAs: string[] = [];

function addDefaultCA(file: fs.PathOrFileDescriptor) {
  try {
    var content = fs.readFileSync(file, { encoding: "ascii" }).trim();
    content = content.replace(/\r\n/g, "\n"); // Handles certificates that have been created in Windows
    var regex =
      /-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g;
    var results = content.match(regex);
    if (!results) throw new Error("Could not parse certificate");
    results.forEach(function (match) {
      rootCAs.push(match.trim());
    });
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.log("failed reading file " + file + ": " + e.message);
    }
  }
}

const addCAs = function (dirs: string | string[]) {
  if (!dirs) {
    return;
  }

  if (typeof dirs === "string") {
    dirs = dirs.split(",").map(function (dir) {
      return dir.trim();
    });
  }

  var files, stat, file, i, j;
  for (i = 0; i < dirs.length; ++i) {
    try {
      stat = fs.statSync(dirs[i]);
      if (stat.isDirectory()) {
        files = fs.readdirSync(dirs[i]);
        for (j = 0; j < files.length; ++j) {
          file = path.resolve(dirs[i], files[j]);
          try {
            stat = fs.statSync(file);
            if (stat.isFile()) {
              addDefaultCA(file);
            }
          } catch (e) {
            if (e.code !== "ENOENT") {
              console.log("failed reading " + file + ": " + e.message);
            }
          }
        }
      } else {
        addDefaultCA(dirs[i]);
      }
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.log("failed reading " + dirs[i] + ": " + e.message);
      }
    }
  }
};

// trap the createSecureContext method and inject custom root CAs whenever invoked
const origCreateSecureContext = tls.createSecureContext;
tls.createSecureContext = function (options) {
  var c = origCreateSecureContext.apply(null, arguments);
  if (!options!.ca && rootCAs.length > 0) {
    rootCAs.forEach(function (ca) {
      // add to the created context our own root CAs
      c.context.addCACert(ca);
    });
  }
  return c;
};

const defaultCALocations = [
  "/etc/ssl/ca-node.pem",
  "misc/flightstats-londonsupplygroup-com-chain.pem",
];

addCAs(defaultCALocations);
