// 브리핑 데이터 조합 서비스

export interface BriefingData {
  jiraIssues: object[];
  unreadEmails: object[];
  timestamp: Date;
}

export async function generateBriefing(userId: string): Promise<BriefingData> {
  // TODO: Jira + Gmail 데이터를 조합하여 브리핑 생성
  console.log(`[BriefingService] Generating briefing for user: ${userId}`);

  return {
    jiraIssues: [],
    unreadEmails: [],
    timestamp: new Date(),
  };
}
