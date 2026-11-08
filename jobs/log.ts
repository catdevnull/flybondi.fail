// Drop-in for the Trigger.dev `logger`: one JSON line per call, read with
// `uc logs flybondi-jobs`.
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, data?: Record<string, unknown>) {
  const line = JSON.stringify(
    { ts: new Date().toISOString(), level, job: process.env.JOB_NAME, message, ...data },
    (_key, value) =>
      value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value,
  );
  (level === "error" || level === "warn" ? console.error : console.log)(line);
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    if (process.env.LOG_DEBUG) emit("debug", message, data);
  },
  info: (message: string, data?: Record<string, unknown>) => emit("info", message, data),
  log: (message: string, data?: Record<string, unknown>) => emit("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => emit("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => emit("error", message, data),
};

// Stand-in for Trigger's `usage.measure`: wall-clock time instead of billed compute.
export async function measure<T>(fn: () => Promise<T>) {
  const start = performance.now();
  const result = await fn();
  return { result, compute: { durationMs: Math.round(performance.now() - start) } };
}
