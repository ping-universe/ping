import { Router, Request, Response } from "express";

export const jiraWebhookRouter = Router();

// Jira Webhook receiver
jiraWebhookRouter.post("/", (req: Request, res: Response) => {
  const event = req.body;
  const webhookEvent = event.webhookEvent;

  console.log(`[Jira] Webhook event: ${webhookEvent}`);

  // TODO: 이벤트 파싱 → Google Chat 알림 카드 발송
  res.sendStatus(200);
});
