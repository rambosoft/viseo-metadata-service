import pino from "pino";

export function createLogger(level: pino.LevelWithSilent) {
  return pino({
    level,
    redact: {
      paths: [
        "req.headers.authorization",
        "authorization",
        "headers.authorization",
        "config.tmdb.apiKey"
      ],
      censor: "[REDACTED]"
    },
    base: null,
    timestamp: pino.stdTimeFunctions.isoTime
  });
}
