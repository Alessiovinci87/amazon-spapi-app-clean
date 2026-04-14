// backend_v2/utils/logger.js
// Logger strutturato centralizzato basato su pino.
// In dev: output colorato via pino-pretty. In prod: JSON su stdout.

const pino = require("pino");

const isDev = process.env.NODE_ENV !== "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  base: { service: "nexus-backend" },
  redact: {
    paths: ["req.headers.authorization", "password", "passwordAttuale", "nuovaPassword", "token", "*.password"],
    censor: "[REDACTED]",
  },
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,service",
      },
    },
  }),
});

module.exports = logger;
