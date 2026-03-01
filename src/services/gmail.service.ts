// Gmail API 호출 서비스

export async function getUnreadEmails(accessToken: string): Promise<object[]> {
  // TODO: Gmail API로 안 읽은 메일 조회
  console.log("[GmailService] Fetching unread emails");
  return [];
}

export async function setupWatch(accessToken: string, topicName: string): Promise<void> {
  // TODO: Gmail Pub/Sub watch 설정
  console.log(`[GmailService] Setting up watch on topic: ${topicName}`);
}
