import { Router, Request, Response } from "express";

export const oauthCallbackRouter = Router();

// Jira OAuth callback
oauthCallbackRouter.get("/jira", (req: Request, res: Response) => {
  const { code } = req.query;
  console.log(`[OAuth] Jira callback received, code: ${code ? "yes" : "no"}`);

  // TODO: code → access_token 교환 → Firestore에 저장
  res.send("Jira 연동이 완료되었습니다! Google Chat으로 돌아가세요.");
});

// Gmail OAuth callback
oauthCallbackRouter.get("/gmail", (req: Request, res: Response) => {
  const { code } = req.query;
  console.log(`[OAuth] Gmail callback received, code: ${code ? "yes" : "no"}`);

  // TODO: code → access_token 교환 → Firestore에 저장
  res.send("Gmail 연동이 완료되었습니다! Google Chat으로 돌아가세요.");
});
