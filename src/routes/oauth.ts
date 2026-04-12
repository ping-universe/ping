import { Router, type Request, type Response, type NextFunction } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { BadRequestError } from "../lib/errors";
import { logger } from "../lib/logger";
import { consumeState, createState } from "../db/oauth-state";
import { setAtlassianConnection, setGmailConnection } from "../db/firestore";
import {
  buildAuthorizeUrl,
  exchangeCode,
  getAccessibleResources,
  getCurrentUser,
} from "../services/atlassian-oauth.service";
import {
  buildGmailAuthorizeUrl,
  exchangeGmailCode,
} from "../services/gmail-oauth.service";
import { getProfile, startWatch } from "../services/gmail.service";

export const oauthRouter = Router();

const startQuery = z.object({
  userId: z.string().min(1),
});

const callbackQuery = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

oauthRouter.get(
  "/atlassian/start",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = startQuery.parse(req.query);
      const state = await createState(userId, "atlassian");
      const url = buildAuthorizeUrl(state);
      logger.info({ userId, requestId: req.id }, "atlassian oauth start");
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  },
);

oauthRouter.get(
  "/atlassian/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state } = callbackQuery.parse(req.query);
      const consumed = await consumeState(state, "atlassian");
      if (!consumed) {
        throw new BadRequestError("Invalid or expired OAuth state");
      }

      const tokens = await exchangeCode(code);
      const [resources, me] = await Promise.all([
        getAccessibleResources(tokens.access_token),
        getCurrentUser(tokens.access_token),
      ]);
      const primary = resources[0];
      if (!primary) {
        throw new BadRequestError("No accessible Atlassian site for this user");
      }

      const expiresAt = Timestamp.fromMillis(Date.now() + tokens.expires_in * 1000);
      await setAtlassianConnection(consumed.userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        cloudId: primary.id,
        siteUrl: primary.url,
        accountId: me.account_id,
      });

      logger.info(
        { userId: consumed.userId, cloudId: primary.id, requestId: req.id },
        "atlassian oauth connected",
      );

      res
        .status(200)
        .type("html")
        .send(renderSuccessPage("Jira / Confluence", primary.name));
    } catch (err) {
      next(err);
    }
  },
);

// ── Gmail OAuth ──

oauthRouter.get(
  "/gmail/start",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = startQuery.parse(req.query);
      const state = await createState(userId, "gmail");
      const url = buildGmailAuthorizeUrl(state);
      logger.info({ userId, requestId: req.id }, "gmail oauth start");
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  },
);

oauthRouter.get(
  "/gmail/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state } = callbackQuery.parse(req.query);
      const consumed = await consumeState(state, "gmail");
      if (!consumed) {
        throw new BadRequestError("Invalid or expired Gmail OAuth state");
      }

      const tokens = await exchangeGmailCode(code);
      if (!tokens.refresh_token) {
        throw new BadRequestError(
          "No refresh_token received. Re-authorize with prompt=consent.",
        );
      }

      const profile = await getProfile(tokens.access_token);
      const watch = await startWatch(tokens.access_token);

      const expiresAt = Timestamp.fromMillis(Date.now() + tokens.expires_in * 1000);
      await setGmailConnection(consumed.userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        emailAddress: profile.emailAddress,
        historyId: watch.historyId,
        watchExpiresAt: Timestamp.fromMillis(watch.expiration),
      });

      logger.info(
        { userId: consumed.userId, email: profile.emailAddress, requestId: req.id },
        "gmail oauth connected",
      );

      res
        .status(200)
        .type("html")
        .send(renderSuccessPage("Gmail", profile.emailAddress));
    } catch (err) {
      next(err);
    }
  },
);

function renderSuccessPage(service: string, siteName: string): string {
  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><title>연동 완료</title>
<style>body{font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#222}
h1{font-size:20px}p{color:#555;line-height:1.6}</style></head>
<body>
<h1>${service} 연동이 완료되었습니다</h1>
<p>연결된 사이트: <strong>${siteName}</strong></p>
<p>이 창을 닫고 Google Chat으로 돌아가세요.</p>
</body></html>`;
}
