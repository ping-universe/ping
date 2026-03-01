import { Router, Request, Response } from "express";

export const gmailPubsubRouter = Router();

// Gmail Pub/Sub push endpoint
gmailPubsubRouter.post("/", (req: Request, res: Response) => {
  const message = req.body.message;

  if (!message) {
    res.sendStatus(400);
    return;
  }

  const data = message.data
    ? Buffer.from(message.data, "base64").toString()
    : null;

  console.log(`[Gmail] Pub/Sub notification: ${data}`);

  // TODO: 메일 변경 감지 → 필터링/요약 → Google Chat 카드 발송
  res.sendStatus(200);
});
