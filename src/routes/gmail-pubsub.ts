import { Router, type Request, type Response } from "express";
import { db } from "../db/firestore";
import { logger } from "../lib/logger";
import { sendCard } from "../services/chat.service";
import { buildGmailCard } from "../services/gmail-card";
import { getMessageMeta, listNewMessagesSince } from "../services/gmail.service";
import { upsertUser } from "../db/firestore";
import type { UserDoc } from "../types/user";

export const gmailPubsubRouter = Router();

interface PubSubPushBody {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
}

interface GmailNotification {
  emailAddress: string;
  historyId: number;
}

gmailPubsubRouter.post("/", async (req: Request, res: Response) => {
  // Always respond 200 fast to avoid Pub/Sub retries.
  res.sendStatus(200);

  const body = req.body as PubSubPushBody;
  const log = logger.child({ requestId: req.id });

  if (!body.message?.data) {
    log.debug("pub/sub message without data, ignoring");
    return;
  }

  let notification: GmailNotification;
  try {
    const decoded = Buffer.from(body.message.data, "base64").toString("utf-8");
    notification = JSON.parse(decoded) as GmailNotification;
  } catch {
    log.warn("failed to decode pub/sub data");
    return;
  }

  const { emailAddress, historyId } = notification;
  log.info({ emailAddress, historyId }, "gmail push received");

  try {
    // Find user by gmail email
    const snap = await db()
      .collection("users")
      .where("gmail.emailAddress", "==", emailAddress)
      .limit(1)
      .get();

    if (snap.empty) {
      log.info({ emailAddress }, "no user found for email");
      return;
    }

    const userDoc = snap.docs[0]!;
    const user = userDoc.data() as UserDoc;

    if (!user.dmSpaceId) {
      log.info({ userId: user.userId }, "user has no DM space");
      return;
    }

    const prevHistoryId = user.gmail?.historyId;
    if (!prevHistoryId) {
      log.debug("no previous historyId, skipping diff");
      return;
    }

    // Fetch new messages since last known historyId
    const newMessages = await listNewMessagesSince(user.userId, prevHistoryId);
    if (newMessages.length === 0) {
      log.debug("no new messages in history diff");
      return;
    }

    // Update stored historyId
    await upsertUser(user.userId, {
      gmail: { ...user.gmail!, historyId: String(historyId) },
    });

    // Send a card for each new message (limit to 5 to avoid spam)
    const toProcess = newMessages.slice(0, 5);
    for (const msg of toProcess) {
      const meta = await getMessageMeta(user.userId, msg.id);
      const built = buildGmailCard(meta);
      await sendCard({
        spaceId: user.dmSpaceId,
        card: built.card,
        text: built.text,
        threadKey: built.threadKey,
      });
    }

    log.info(
      { userId: user.userId, count: toProcess.length },
      "gmail cards delivered",
    );
  } catch (err) {
    log.error(
      { err: err instanceof Error ? err.message : String(err) },
      "gmail pubsub processing failed",
    );
  }
});
