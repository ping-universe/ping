import { Router, Request, Response } from "express";

export const chatRouter = Router();

// Google Chat Bot event receiver
chatRouter.post("/", (req: Request, res: Response) => {
  const event = req.body;
  const eventType = event.type;

  console.log(`[Chat] Received event: ${eventType}`);

  switch (eventType) {
    case "ADDED_TO_SPACE":
      res.json({ text: "안녕하세요! Ping입니다 👋 온보딩을 시작할게요." });
      break;

    case "MESSAGE":
      // TODO: 메시지 처리 로직
      res.json({ text: `받은 메시지: ${event.message?.text || ""}` });
      break;

    case "CARD_CLICKED":
      // TODO: 카드 클릭 핸들링
      res.json({});
      break;

    default:
      res.json({});
  }
});
