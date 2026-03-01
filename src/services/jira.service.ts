import { config } from "../config/env";

// Jira API 호출 서비스

export async function getAssignedIssues(userEmail: string): Promise<object[]> {
  // TODO: Jira REST API로 사용자에게 할당된 이슈 조회
  console.log(`[JiraService] Fetching issues for: ${userEmail}`);
  return [];
}

export async function parseWebhookEvent(payload: object): Promise<object | null> {
  // TODO: Jira Webhook 이벤트 파싱
  console.log("[JiraService] Parsing webhook event");
  return null;
}
