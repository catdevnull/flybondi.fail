import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_gybqwphyhogmifyynunh",
  runtime: "bun",
  logLevel: "log",
  // Set the maxDuration to 300 seconds for all tasks. See https://trigger.dev/docs/runs/max-duration
  maxDuration: 300,
  machine: "micro",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./trigger"],
  build: { external: ["bun"] },
});
