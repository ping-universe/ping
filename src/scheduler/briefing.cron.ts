import cron from "node-cron";

export function initScheduler(): void {
  // 매일 오전 9시 (KST) 아침 브리핑
  cron.schedule(
    "0 9 * * 1-5",
    async () => {
      console.log("[Briefing] Running morning briefing...");

      // TODO: 사용자별 브리핑 시간 조회 (Firestore)
      // TODO: Jira API → 할당된 이슈 조회
      // TODO: Gmail API → 안 읽은 메일 조회
      // TODO: 브리핑 카드 조합 → Google Chat 발송
    },
    { timezone: "Asia/Seoul" }
  );

  console.log("[Briefing] Scheduled: weekdays 09:00 KST");
}
