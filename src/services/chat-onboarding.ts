import { config } from "../config/env";
import type { ChatCardV2 } from "./chat.service";
import type { UserDoc } from "../types/user";

function atlassianStartUrl(userId: string): string {
  const u = new URL("/oauth/atlassian/start", config.baseUrl);
  u.searchParams.set("userId", userId);
  return u.toString();
}

function gmailStartUrl(userId: string): string {
  const u = new URL("/oauth/gmail/start", config.baseUrl);
  u.searchParams.set("userId", userId);
  return u.toString();
}

export function buildWelcomeCard(userId: string, displayName?: string): ChatCardV2 {
  const greeting = displayName ? `${displayName}님, ` : "";
  return {
    header: {
      title: "Ping에 오신 걸 환영합니다 👋",
      subtitle: "Jira와 Gmail을 연결하면 매일 아침 브리핑을 받을 수 있어요",
    },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: `${greeting}아래 두 서비스를 연결해 주세요. 연결 후에는 실시간 알림과 아침 브리핑이 자동으로 전송됩니다.`,
            },
          },
          {
            buttonList: {
              buttons: [
                {
                  text: "Jira / Confluence 연결",
                  onClick: { openLink: { url: atlassianStartUrl(userId) } },
                },
                {
                  text: "Gmail 연결",
                  onClick: { openLink: { url: gmailStartUrl(userId) } },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

export function buildStatusCard(user: UserDoc | null, userId: string): ChatCardV2 {
  const atlassian = user?.atlassian
    ? `✅ ${user.atlassian.siteUrl}`
    : "❌ 미연결";
  const gmail = user?.gmail ? `✅ ${user.gmail.emailAddress}` : "❌ 미연결";
  const briefing = user?.briefing
    ? `${user.briefing.enabled ? "✅" : "⏸"} ${user.briefing.time} ${user.briefing.timezone}`
    : "미설정";

  return {
    header: { title: "연동 상태", subtitle: "Ping" },
    sections: [
      {
        widgets: [
          { decoratedText: { topLabel: "Jira / Confluence", text: atlassian } },
          { decoratedText: { topLabel: "Gmail", text: gmail } },
          { decoratedText: { topLabel: "아침 브리핑", text: briefing } },
          {
            buttonList: {
              buttons: [
                {
                  text: "Jira 다시 연결",
                  onClick: { openLink: { url: atlassianStartUrl(userId) } },
                },
                {
                  text: "Gmail 다시 연결",
                  onClick: { openLink: { url: gmailStartUrl(userId) } },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

export const HELP_TEXT = [
  "사용 가능한 명령어:",
  "• *상태* — 현재 연동 상태 보기",
  "• *연결* — Jira / Gmail 연결 링크 다시 보기",
  "• *도움말* — 이 메시지",
].join("\n");
