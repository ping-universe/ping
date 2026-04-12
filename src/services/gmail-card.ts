import type { gmail_v1 } from "googleapis";
import type { ChatCardV2 } from "./chat.service";

export interface BuiltGmailCard {
  card: ChatCardV2;
  text: string;
  threadKey: string;
}

function getHeader(
  msg: gmail_v1.Schema$Message,
  name: string,
): string {
  return (
    msg.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildGmailCard(msg: gmail_v1.Schema$Message): BuiltGmailCard {
  const from = getHeader(msg, "From");
  const subject = getHeader(msg, "Subject") || "(제목 없음)";
  const date = getHeader(msg, "Date");
  const snippet = msg.snippet ?? "";
  const threadKey = `gmail-${msg.threadId ?? msg.id}`;

  const card: ChatCardV2 = {
    header: {
      title: "새 메일",
      subtitle: truncate(subject, 60),
    },
    sections: [
      {
        widgets: [
          {
            decoratedText: {
              topLabel: "보낸 사람",
              text: escapeHtml(from),
              wrapText: true,
            },
          },
          {
            decoratedText: {
              topLabel: "제목",
              text: `<b>${escapeHtml(subject)}</b>`,
              wrapText: true,
            },
          },
          {
            textParagraph: {
              text: escapeHtml(truncate(snippet, 250)),
            },
          },
          ...(date
            ? [
                {
                  decoratedText: {
                    topLabel: "수신 시각",
                    text: date,
                  },
                },
              ]
            : []),
          {
            buttonList: {
              buttons: [
                {
                  text: "Gmail에서 열기",
                  onClick: {
                    openLink: {
                      url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  return {
    card,
    text: `[새 메일] ${from}: ${subject}`,
    threadKey,
  };
}
