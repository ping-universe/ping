import { Router, type Request, type Response } from "express";
import { findUserByAtlassianAccountId } from "../db/firestore";
import { logger } from "../lib/logger";
import { sendCard } from "../services/chat.service";
import { buildJiraCard, type JiraWebhookEvent } from "../services/jira-card";
import {
  jiraRawBody,
  verifyJiraSignature,
} from "../middleware/jira-webhook-verify";

export const jiraWebhookRouter = Router();

jiraWebhookRouter.post(
  "/",
  jiraRawBody,
  verifyJiraSignature,
  async (req: Request, res: Response) => {
    // Respond fast so Jira doesn't retry while we process.
    res.sendStatus(200);

    const event = req.body as JiraWebhookEvent;
    const log = logger.child({ requestId: req.id, webhookEvent: event.webhookEvent });
    log.info({ issueKey: event.issue?.key }, "jira webhook received");

    try {
      const built = buildJiraCard(event);
      if (!built) {
        log.debug("event ignored (no issue)");
        return;
      }
      if (!built.recipientAccountId) {
        log.debug({ issueKey: event.issue?.key }, "no assignee, skipping");
        return;
      }

      const user = await findUserByAtlassianAccountId(built.recipientAccountId);
      if (!user?.dmSpaceId) {
        log.info(
          { accountId: built.recipientAccountId },
          "no matching user or DM space, skipping",
        );
        return;
      }

      await sendCard({
        spaceId: user.dmSpaceId,
        card: built.card,
        text: built.text,
        threadKey: built.threadKey,
      });
      log.info({ userId: user.userId }, "jira card delivered");
    } catch (err) {
      log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "jira webhook processing failed",
      );
    }
  },
);
