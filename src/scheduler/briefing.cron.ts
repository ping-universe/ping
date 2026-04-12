import cron from "node-cron";
import { db } from "../db/firestore";
import { logger } from "../lib/logger";
import { gatherBriefingData, buildBriefingCard } from "../services/briefing.service";
import { sendCard } from "../services/chat.service";
import type { UserDoc } from "../types/user";

export function initScheduler(): void {
  // Run every minute — check if any user's configured briefing time matches now.
  // This allows per-user scheduling without spawning one cron per user.
  cron.schedule(
    "* * * * 1-5",
    async () => {
      const now = new Date();
      const snap = await db().collection("users").get();

      for (const doc of snap.docs) {
        const user = doc.data() as UserDoc;
        if (!user.briefing?.enabled) continue;
        if (!user.dmSpaceId) continue;

        const targetTime = user.briefing.time ?? "09:00";
        const tz = user.briefing.timezone ?? "Asia/Seoul";

        const userNow = formatTimeInTZ(now, tz);
        if (userNow !== targetTime) continue;

        // Avoid duplicate sends: check seconds — only fire in the first 30s of the minute
        const seconds = getSecondsInTZ(now, tz);
        if (seconds >= 30) continue;

        logger.info({ userId: user.userId, time: targetTime, tz }, "sending briefing");

        try {
          const data = await gatherBriefingData(user.userId);
          const card = buildBriefingCard(data);

          await sendCard({
            spaceId: user.dmSpaceId,
            card,
            text: `아침 브리핑 — Jira ${data.jiraIssues.length}건, Gmail ${data.unreadEmails.length}건`,
          });

          logger.info({ userId: user.userId }, "briefing delivered");
        } catch (err) {
          logger.error(
            {
              userId: user.userId,
              err: err instanceof Error ? err.message : String(err),
            },
            "briefing failed",
          );
        }
      }
    },
    { timezone: "Asia/Seoul" },
  );

  logger.info("briefing scheduler initialized (per-minute check, weekdays)");
}

function formatTimeInTZ(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function getSecondsInTZ(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    second: "2-digit",
    timeZone: tz,
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "second")?.value ?? "0");
}
