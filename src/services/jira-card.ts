import type { ChatCardV2 } from "./chat.service";

export interface JiraWebhookUser {
  accountId: string;
  displayName?: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraWebhookIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status?: { name: string };
    priority?: { name: string } | null;
    assignee?: JiraWebhookUser | null;
    reporter?: JiraWebhookUser | null;
    issuetype?: { name: string; iconUrl?: string };
  };
}

export interface JiraWebhookComment {
  id: string;
  author: JiraWebhookUser;
  body: string;
  created: string;
  updated: string;
}

export interface JiraWebhookEvent {
  webhookEvent: string;
  issue?: JiraWebhookIssue;
  comment?: JiraWebhookComment;
  user?: JiraWebhookUser;
  changelog?: {
    items: Array<{
      field: string;
      fromString?: string | null;
      toString?: string | null;
    }>;
  };
}

export interface BuiltCard {
  card: ChatCardV2;
  text: string;
  // Who should receive this notification (Atlassian accountId).
  recipientAccountId: string | null;
  // Stable thread key so updates on the same issue stay threaded.
  threadKey: string;
}

const EVENT_LABELS: Record<string, string> = {
  "jira:issue_created": "새 이슈",
  "jira:issue_updated": "이슈 업데이트",
  "jira:issue_deleted": "이슈 삭제",
  comment_created: "새 댓글",
  comment_updated: "댓글 수정",
};

function siteFromSelf(self: string): string {
  try {
    const u = new URL(self);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

function issueUrl(issue: JiraWebhookIssue): string {
  const site = siteFromSelf(issue.self);
  return site ? `${site}/browse/${issue.key}` : "";
}

export function buildJiraCard(event: JiraWebhookEvent): BuiltCard | null {
  const issue = event.issue;
  if (!issue) return null;

  const label = EVENT_LABELS[event.webhookEvent] ?? event.webhookEvent;
  const url = issueUrl(issue);
  const threadKey = `jira-${issue.key}`;

  const headerLines: string[] = [];
  if (issue.fields.status?.name) {
    headerLines.push(`상태: <b>${issue.fields.status.name}</b>`);
  }
  if (issue.fields.priority?.name) {
    headerLines.push(`우선순위: ${issue.fields.priority.name}`);
  }
  if (issue.fields.assignee?.displayName) {
    headerLines.push(`담당자: ${issue.fields.assignee.displayName}`);
  }

  const widgets: NonNullable<
    NonNullable<ChatCardV2["sections"]>[number]["widgets"]
  > = [
    {
      decoratedText: {
        topLabel: label,
        text: `<b>${issue.key}</b> · ${escapeHtml(issue.fields.summary)}`,
        wrapText: true,
      },
    },
  ];

  if (headerLines.length > 0) {
    widgets.push({ textParagraph: { text: headerLines.join("  ·  ") } });
  }

  if (event.comment) {
    const body = truncate(stripAdfText(event.comment.body), 300);
    widgets.push({
      decoratedText: {
        topLabel: `${event.comment.author.displayName ?? "댓글"}`,
        text: escapeHtml(body),
        wrapText: true,
      },
    });
  } else if (event.changelog?.items?.length) {
    const changes = event.changelog.items
      .map(
        (i) =>
          `<b>${escapeHtml(i.field)}</b>: ${escapeHtml(
            i.fromString ?? "—",
          )} → ${escapeHtml(i.toString ?? "—")}`,
      )
      .join("<br>");
    widgets.push({ textParagraph: { text: changes } });
  }

  if (url) {
    widgets.push({
      buttonList: {
        buttons: [
          {
            text: "Jira에서 열기",
            onClick: { openLink: { url } },
          },
        ],
      },
    });
  }

  const card: ChatCardV2 = {
    header: {
      title: `${label} · ${issue.key}`,
      subtitle: issue.fields.issuetype?.name ?? "Issue",
    },
    sections: [{ widgets }],
  };

  return {
    card,
    text: `[${label}] ${issue.key} — ${issue.fields.summary}`,
    recipientAccountId: issue.fields.assignee?.accountId ?? null,
    threadKey,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Jira ADF comment bodies can be plain string (old API) or objects (v3).
// This helper accepts either and returns a flat string.
function stripAdfText(body: unknown): string {
  if (typeof body === "string") return body;
  if (!body || typeof body !== "object") return "";
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as { text?: string; content?: unknown[] };
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(body);
  return parts.join(" ").trim();
}
