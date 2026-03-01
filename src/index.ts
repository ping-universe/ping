import express from "express";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat";
import { jiraWebhookRouter } from "./routes/jira-webhook";
import { gmailPubsubRouter } from "./routes/gmail-pubsub";
import { oauthCallbackRouter } from "./routes/oauth-callback";
import { initScheduler } from "./scheduler/briefing.cron";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ping-universe", timestamp: new Date().toISOString() });
});

// Routes
app.use("/chat", chatRouter);
app.use("/webhook/jira", jiraWebhookRouter);
app.use("/webhook/gmail", gmailPubsubRouter);
app.use("/oauth/callback", oauthCallbackRouter);

// Start server
app.listen(PORT, () => {
  console.log(`[Ping] Server running on port ${PORT}`);
  initScheduler();
  console.log("[Ping] Briefing scheduler initialized");
});
