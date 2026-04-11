import express from "express";
import pinoHttp from "pino-http";
import { config } from "./config/env";
import { logger } from "./lib/logger";
import { requestId } from "./middleware/request-id";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { chatRouter } from "./routes/chat";
import { jiraWebhookRouter } from "./routes/jira-webhook";
import { gmailPubsubRouter } from "./routes/gmail-pubsub";
import { oauthCallbackRouter } from "./routes/oauth-callback";
import { initScheduler } from "./scheduler/briefing.cron";

const app = express();

app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as express.Request).id,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ping-universe",
    env: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use("/chat", chatRouter);
app.use("/webhook/jira", jiraWebhookRouter);
app.use("/webhook/gmail", gmailPubsubRouter);
app.use("/oauth", oauthCallbackRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "ping-universe listening");
  initScheduler();
});

function shutdown(signal: string): void {
  logger.info({ signal }, "shutting down");
  server.close((err) => {
    if (err) {
      logger.error({ err: err.message }, "server close failed");
      process.exit(1);
    }
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn("forced exit after 10s");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, "uncaughtException");
  process.exit(1);
});
