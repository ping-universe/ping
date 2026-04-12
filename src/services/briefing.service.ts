import type { gmail_v1 } from "googleapis";
import { logger } from "../lib/logger";
import { getAssignedIssues, type JiraIssue } from "./jira.service";
import { getUnreadEmails } from "./gmail.service";
import type { ChatCardV2 } from "./chat.service";

export interface BriefingData {
  jiraIssues: JiraIssue[];
  unreadEmails: gmail_v1.Schema$Message[];
  timestamp: Date;
}

export async function gatherBriefingData(
  userId: string,
): Promise<BriefingData> {
  const [jiraIssues, unreadEmails] = await Promise.allSettled([
    getAssignedIssues(userId, 10),
    getUnreadEmails(userId, 10),
  ]);

  return {
    jiraIssues: jiraIssues.status === "fulfilled" ? jiraIssues.value : [],
    unreadEmails: unreadEmails.status === "fulfilled" ? unreadEmails.value : [],
    timestamp: new Date(),
  };
}

function getHeader(msg: gmail_v1.Schema$Message, name: string): string {
  return (
    msg.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function buildBriefingCard(data: BriefingData): ChatCardV2 {
  const dateStr = data.timestamp.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const sections: NonNullable<ChatCardV2["sections"]> = [];

  // Jira section
  if (data.jiraIssues.length > 0) {
    const issueLines = data.jiraIssues
      .map((i) => {
        const status = i.fields.status?.name ?? "";
        const priority = i.fields.priority?.name ?? "";
        return `• <b>${escapeHtml(i.key)}</b> ${escapeHtml(truncate(i.fields.summary, 60))} [${escapeHtml(status)}${priority ? ` · ${escapeHtml(priority)}` : ""}]`;
      })
      .join("<br>");

    sections.push({
      header: `Jira 할당 이슈 (${data.jiraIssues.length})`,
      widgets: [{ textParagraph: { text: issueLines } }],
    });
  } else {
    sections.push({
      header: "Jira",
      widgets: [
        { textParagraph: { text: "할당된 미완료 이슈가 없습니다." } },
      ],
    });
  }

  // Gmail section
  if (data.unreadEmails.length > 0) {
    const mailLines = data.unreadEmails
      .map((m) => {
        const from = escapeHtml(truncate(getHeader(m, "From"), 40));
        const subject = escapeHtml(truncate(getHeader(m, "Subject") || "(제목 없음)", 50));
        return `• <b>${from}</b>: ${subject}`;
      })
      .join("<br>");

    sections.push({
      header: `Gmail 안 읽은 메일 (${data.unreadEmails.length})`,
      widgets: [{ textParagraph: { text: mailLines } }],
    });
  } else {
    sections.push({
      header: "Gmail",
      widgets: [
        { textParagraph: { text: "안 읽은 메일이 없습니다." } },
      ],
    });
  }

  return {
    header: {
      title: `아침 브리핑`,
      subtitle: dateStr,
    },
    sections,
  };
}
