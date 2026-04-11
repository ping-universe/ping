import { Router, type Request, type Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { getUser, upsertUser } from "../db/firestore";
import { logger } from "../lib/logger";
import {
  HELP_TEXT,
  buildStatusCard,
  buildWelcomeCard,
} from "../services/chat-onboarding";
import { DEFAULT_BRIEFING } from "../types/user";

export const chatRouter = Router();

interface ChatEventUser {
  name?: string;
  displayName?: string;
  email?: string;
  type?: string;
}

interface ChatSpace {
  name?: string;
  type?: string;
  singleUserBotDm?: boolean;
}

interface ChatMessage {
  text?: string;
  argumentText?: string;
}

interface ChatEvent {
  type?: string;
  eventType?: string;
  space?: ChatSpace;
  user?: ChatEventUser;
  message?: ChatMessage;
}

function normalizeCommand(text: string): string {
  return text.trim().toLowerCase();
}

chatRouter.post("/", async (req: Request, res: Response) => {
  const event = req.body as ChatEvent;
  const eventType = event.type ?? event.eventType ?? "";
  const log = logger.child({ requestId: req.id, chatEvent: eventType });

  const userName = event.user?.name;
  const spaceName = event.space?.name;

  if (!userName) {
    log.debug("missing user on event");
    res.json({});
    return;
  }

  try {
    switch (eventType) {
      case "ADDED_TO_SPACE": {
        if (spaceName) {
          await upsertUser(userName, {
            userId: userName,
            dmSpaceId: spaceName,
            displayName: event.user?.displayName,
            email: event.user?.email,
            briefing: DEFAULT_BRIEFING,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
        log.info({ user: userName, space: spaceName }, "added to space");
        res.json({
          cardsV2: [
            {
              cardId: `welcome-${Date.now()}`,
              card: buildWelcomeCard(userName, event.user?.displayName),
            },
          ],
        });
        return;
      }

      case "REMOVED_FROM_SPACE": {
        log.info({ user: userName }, "removed from space");
        res.json({});
        return;
      }

      case "MESSAGE": {
        const text = normalizeCommand(
          event.message?.argumentText ?? event.message?.text ?? "",
        );

        if (text === "상태" || text === "status") {
          const user = await getUser(userName);
          res.json({
            cardsV2: [
              {
                cardId: `status-${Date.now()}`,
                card: buildStatusCard(user, userName),
              },
            ],
          });
          return;
        }

        if (text === "연결" || text === "connect") {
          res.json({
            cardsV2: [
              {
                cardId: `welcome-${Date.now()}`,
                card: buildWelcomeCard(userName, event.user?.displayName),
              },
            ],
          });
          return;
        }

        res.json({ text: HELP_TEXT });
        return;
      }

      default:
        res.json({});
        return;
    }
  } catch (err) {
    log.error(
      { err: err instanceof Error ? err.message : String(err) },
      "chat event handling failed",
    );
    res.json({ text: "처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요." });
  }
});
