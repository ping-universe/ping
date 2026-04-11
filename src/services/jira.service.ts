import { Timestamp } from "firebase-admin/firestore";
import { getUser, setAtlassianConnection } from "../db/firestore";
import { HttpError, NotFoundError, UnauthorizedError } from "../lib/errors";
import { logger } from "../lib/logger";
import { refreshAccessToken } from "./atlassian-oauth.service";
import type { AtlassianConnection } from "../types/user";

const REFRESH_SKEW_MS = 60 * 1000;

export interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: {
    summary: string;
    status: { name: string; statusCategory: { key: string } };
    priority?: { name: string } | null;
    assignee?: { displayName: string; accountId: string } | null;
    duedate?: string | null;
    updated: string;
    issuetype: { name: string; iconUrl: string };
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

async function ensureFreshTokens(
  userId: string,
  conn: AtlassianConnection,
): Promise<AtlassianConnection> {
  const expiresMs = conn.expiresAt.toMillis();
  if (expiresMs - REFRESH_SKEW_MS > Date.now()) return conn;

  logger.info({ userId }, "refreshing atlassian token");
  const refreshed = await refreshAccessToken(conn.refreshToken);
  const next: AtlassianConnection = {
    ...conn,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? conn.refreshToken,
    expiresAt: Timestamp.fromMillis(Date.now() + refreshed.expires_in * 1000),
    scope: refreshed.scope,
    tokenType: refreshed.token_type,
  };
  await setAtlassianConnection(userId, next);
  return next;
}

async function getConnection(userId: string): Promise<AtlassianConnection> {
  const user = await getUser(userId);
  if (!user?.atlassian) {
    throw new NotFoundError("Atlassian connection not found for user");
  }
  return ensureFreshTokens(userId, user.atlassian);
}

export async function jiraFetch<T>(
  userId: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const conn = await getConnection(userId);
  const url = `https://api.atlassian.com/ex/jira/${conn.cloudId}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${conn.accessToken}`,
      Accept: "application/json",
    },
  });
  if (res.status === 401) {
    throw new UnauthorizedError("Jira rejected token", { path });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new HttpError(res.status, `Jira request failed: ${path}`, body);
  }
  return (await res.json()) as T;
}

export async function getAssignedIssues(
  userId: string,
  maxResults = 20,
): Promise<JiraIssue[]> {
  const jql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
  const params = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    fields: "summary,status,priority,assignee,duedate,updated,issuetype",
  });
  const data = await jiraFetch<JiraSearchResponse>(
    userId,
    `/rest/api/3/search?${params.toString()}`,
  );
  return data.issues;
}

export async function parseWebhookEvent(payload: unknown): Promise<unknown> {
  logger.debug({ payload }, "jira webhook event received");
  return payload;
}
