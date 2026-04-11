import pino from "pino";
import { config } from "../config/env";

export const logger = pino({
  level: config.logLevel,
  base: { service: "ping-universe", env: config.nodeEnv },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(config.isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }),
});

export type Logger = typeof logger;
