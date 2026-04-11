import { google, type chat_v1 } from "googleapis";
import { config } from "../config/env";
import { logger } from "../lib/logger";

const CHAT_SCOPES = [
  "https://www.googleapis.com/auth/chat.bot",
  "https://www.googleapis.com/auth/chat.messages.create",
];

let chatClient: chat_v1.Chat | undefined;

function getChatClient(): chat_v1.Chat {
  if (chatClient) return chatClient;
  const auth = new google.auth.GoogleAuth({
    keyFile: config.google.credentials,
    scopes: CHAT_SCOPES,
  });
  chatClient = google.chat({ version: "v1", auth });
  return chatClient;
}

export type ChatCardV2 = chat_v1.Schema$GoogleAppsCardV1Card;

export interface SendCardOptions {
  spaceId: string;
  card: ChatCardV2;
  text?: string;
  threadKey?: string;
}

export async function sendCard(opts: SendCardOptions): Promise<string | null> {
  const chat = getChatClient();
  const parent = opts.spaceId.startsWith("spaces/")
    ? opts.spaceId
    : `spaces/${opts.spaceId}`;

  const res = await chat.spaces.messages.create({
    parent,
    requestBody: {
      text: opts.text,
      cardsV2: [{ cardId: `card-${Date.now()}`, card: opts.card }],
      ...(opts.threadKey
        ? { thread: { threadKey: opts.threadKey } }
        : {}),
    },
    messageReplyOption: opts.threadKey
      ? "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD"
      : undefined,
  });

  const name = res.data.name ?? null;
  logger.info({ parent, messageName: name }, "chat message sent");
  return name;
}

export async function sendText(spaceId: string, text: string): Promise<void> {
  const chat = getChatClient();
  const parent = spaceId.startsWith("spaces/") ? spaceId : `spaces/${spaceId}`;
  await chat.spaces.messages.create({
    parent,
    requestBody: { text },
  });
}

export async function findOrCreateDm(chatUserId: string): Promise<string> {
  const chat = getChatClient();
  const res = await chat.spaces.findDirectMessage({
    name: chatUserId.startsWith("users/") ? chatUserId : `users/${chatUserId}`,
  });
  const name = res.data.name;
  if (!name) throw new Error(`DM space not found for ${chatUserId}`);
  return name;
}
