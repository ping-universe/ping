import cron from "node-cron";
import { db } from "../db/firestore";
import { logger } from "../lib/logger";
import { renewWatch } from "../services/gmail.service";
import type { UserDoc } from "../types/user";

const TWO_DAYS_MS = 2 * 24 * 3600 * 1000;

export function initGmailWatchCron(): void {
  // Run daily at 03:00 KST — renew watches expiring within 2 days.
  cron.schedule(
    "0 3 * * *",
    async () => {
      logger.info("gmail watch renewal cron started");
      try {
        const snap = await db().collection("users").get();
        let renewed = 0;

        for (const doc of snap.docs) {
          const user = doc.data() as UserDoc;
          if (!user.gmail?.watchExpiresAt) continue;

          const expiresMs = user.gmail.watchExpiresAt.toMillis();
          if (expiresMs - TWO_DAYS_MS > Date.now()) continue;

          try {
            await renewWatch(user.userId);
            renewed++;
          } catch (err) {
            logger.error(
              {
                userId: user.userId,
                err: err instanceof Error ? err.message : String(err),
              },
              "failed to renew gmail watch",
            );
          }
        }

        logger.info({ renewed }, "gmail watch renewal cron finished");
      } catch (err) {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          "gmail watch cron failed",
        );
      }
    },
    { timezone: "Asia/Seoul" },
  );

  logger.info("gmail watch renewal scheduled: daily 03:00 KST");
}
