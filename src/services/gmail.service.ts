import { google, type gmail_v1 } from "googleapis";
import { Timestamp } from "firebase-admin/firestore";
import { config } from "../config/env";
import { getUser, setGmailConnection } from "../db/firestore";
import { NotFoundError, UnauthorizedError } from "../lib/errors";
import { logger } from "../lib/logger";
import { refreshGmailAccessToken } from "./gmail-oauth.service";
import type { GmailConnection } from "../types/user";

const REFRESH_SKEW_MS = 60 * 1000;

// ── Public helpers (used during OAuth callback with a raw access token) ──

export interface GmailProfile {
  emailAddress: string;
}

export interface WatchResponse {
  historyId: string;
  expiration: number;
}

export async function getProfile(accessToken: string): Promise<GmailProfile> {
  const gmail = buildClient(accessToken);
  const res = await gmail.users.getProfile({ userId: "me" });
  return { emailAddress: res.data.emailAddress ?? "" };
}

export async function startWatch(accessToken: string): Promise<WatchResponse> {
  const gmail = buildClient(accessToken);
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: config.gmail.pubsubTopic,
      labelIds: ["INBOX"],
    },
  });
  return {
    historyId: String(res.data.historyId ?? "0"),
    expiration: Number(res.data.expiration ?? Date.now() + 7 * 24 * 3600 * 1000),
  };
}

// ── Per-user helpers (loads tokens from Firestore, auto-refreshes) ──

async function ensureFreshTokens(
  userId: string,
  conn: GmailConnection,
): Promise<GmailConnection> {
  if (conn.expiresAt.toMillis() - REFRESH_SKEW_MS > Date.now()) return conn;

  logger.info({ userId }, "refreshing gmail token");
  const refreshed = await refreshGmailAccessToken(conn.refreshToken);
  const next: GmailConnection = {
    ...conn,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? conn.refreshToken,
    expiresAt: Timestamp.fromMillis(Date.now() + refreshed.expires_in * 1000),
    scope: refreshed.scope,
    tokenType: refreshed.token_type,
  };
  await setGmailConnection(userId, next);
  return next;
}

async function getConnection(userId: string): Promise<GmailConnection> {
  const user = await getUser(userId);
  if (!user?.gmail) {
    throw new NotFoundError("Gmail connection not found for user");
  }
  return ensureFreshTokens(userId, user.gmail);
}

function buildClient(accessToken: string): gmail_v1.Gmail {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

async function getUserClient(userId: string) {
  const conn = await getConnection(userId);
  return { gmail: buildClient(conn.accessToken), conn };
}

// ── Gmail API wrappers ──

export async function getUnreadEmails(
  userId: string,
  maxResults = 10,
): Promise<gmail_v1.Schema$Message[]> {
  const { gmail } = await getUserClient(userId);
  const list = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread category:primary",
    maxResults,
  });
  const ids = list.data.messages ?? [];
  if (ids.length === 0) return [];

  const messages = await Promise.all(
    ids.map(async (m) => {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      return full.data;
    }),
  );
  return messages;
}

export interface HistoryMessage {
  id: string;
  threadId: string;
}

export async function listNewMessagesSince(
  userId: string,
  startHistoryId: string,
): Promise<HistoryMessage[]> {
  const { gmail } = await getUserClient(userId);
  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
    labelId: "INBOX",
  });
  const history = res.data.history ?? [];
  const messages: HistoryMessage[] = [];
  for (const h of history) {
    for (const added of h.messagesAdded ?? []) {
      if (added.message?.id && added.message?.threadId) {
        messages.push({
          id: added.message.id,
          threadId: added.message.threadId,
        });
      }
    }
  }
  return messages;
}

export async function getMessageMeta(
  userId: string,
  messageId: string,
): Promise<gmail_v1.Schema$Message> {
  const { gmail } = await getUserClient(userId);
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["From", "Subject", "Date"],
  });
  return res.data;
}

export async function renewWatch(userId: string): Promise<WatchResponse> {
  const conn = await getConnection(userId);
  const watch = await startWatch(conn.accessToken);
  await setGmailConnection(userId, {
    ...conn,
    historyId: watch.historyId,
    watchExpiresAt: Timestamp.fromMillis(watch.expiration),
  });
  logger.info({ userId, historyId: watch.historyId }, "gmail watch renewed");
  return watch;
}
