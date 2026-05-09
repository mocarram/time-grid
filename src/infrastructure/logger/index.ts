// Tiny structured logger. Lives at the infrastructure boundary so app code
// never touches console.* directly.

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): Level {
  const env = (typeof process !== "undefined" ? process.env.LOG_LEVEL : "") || "";
  if (env === "debug" || env === "info" || env === "warn" || env === "error") return env;
  return process.env.NODE_ENV === "production" ? "warn" : "info";
}

function emit(level: Level, scope: string, message: string, fields?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel()]) return;
  const payload = { level, scope, message, ...(fields ?? {}), ts: new Date().toISOString() };
  // eslint-disable-next-line no-console
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(JSON.stringify(payload));
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  scoped(scope: string): Logger;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, fields) => emit("debug", scope, message, fields),
    info: (message, fields) => emit("info", scope, message, fields),
    warn: (message, fields) => emit("warn", scope, message, fields),
    error: (message, fields) => emit("error", scope, message, fields),
    scoped: (sub) => createLogger(`${scope}.${sub}`),
  };
}

export const logger = createLogger("tg");
