// Runs one job by name: `node --import tsx jobs/run.ts <job>`.
// Replaces Trigger.dev: supercronic (jobs/crontab) does the scheduling and
// skips a run while the previous one is still going; this file does the
// retries (3 attempts, like trigger.config.ts) and the max duration.
import { logger } from "./log";
import { processLatestFlightData } from "./process-latest-flight-data";
import { scrapAerolineasTodayAndYesterday } from "./scrap-aerolineas";
import { scrapMatriculasIfMissing, sql as airfleetsSql } from "./scrap-airfleets";

const JOBS: Record<string, { run: () => Promise<void>; maxDurationS: number }> = {
  "scrap-aerolineas": { run: scrapAerolineasTodayAndYesterday, maxDurationS: 1500 },
  "scrap-matriculas": { run: scrapMatriculasIfMissing, maxDurationS: 1800 },
  "process-latest-flight-data": { run: processLatestFlightData, maxDurationS: 1800 },
};

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const name = process.argv[2];
  const job = JOBS[name];
  if (!job) {
    console.error(`usage: run.ts <${Object.keys(JOBS).join("|")}>`);
    process.exit(2);
  }
  process.env.JOB_NAME = name;

  setTimeout(() => {
    logger.error("Job exceeded max duration, exiting", { maxDurationS: job.maxDurationS });
    process.exit(124);
  }, job.maxDurationS * 1000).unref();

  for (let attempt = 1; ; attempt++) {
    const start = Date.now();
    try {
      logger.info("Job started", { attempt });
      await job.run();
      logger.info("Job finished", { attempt, durationMs: Date.now() - start });
      break;
    } catch (error) {
      logger.error("Job failed", { attempt, durationMs: Date.now() - start, error });
      if (attempt >= MAX_ATTEMPTS) process.exit(1);
      await sleep(Math.min(10_000, 1000 * 2 ** (attempt - 1)));
    }
  }

  await airfleetsSql.end({ timeout: 5 });
  process.exit(0);
}

main();
