import { config } from "../config/env";
import { BadRequestError, UnauthorizedError } from "../lib/errors";

export interface AtlassianTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface AccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl?: string;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: config.atlassian.clientId,
    scope: config.atlassian.scopes.join(" "),
    redirect_uri: config.atlassian.redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
  });
  return `${config.atlassian.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<AtlassianTokenResponse> {
  const res = await fetch(config.atlassian.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.atlassian.clientId,
      client_secret: config.atlassian.clientSecret,
      code,
      redirect_uri: config.atlassian.redirectUri,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new BadRequestError("Atlassian token exchange failed", {
      status: res.status,
      body,
    });
  }
  return (await res.json()) as AtlassianTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<AtlassianTokenResponse> {
  const res = await fetch(config.atlassian.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: config.atlassian.clientId,
      client_secret: config.atlassian.clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new UnauthorizedError("Atlassian token refresh failed", {
      status: res.status,
      body,
    });
  }
  return (await res.json()) as AtlassianTokenResponse;
}

export interface AtlassianMe {
  account_id: string;
  email?: string;
  name?: string;
  picture?: string;
}

export async function getCurrentUser(accessToken: string): Promise<AtlassianMe> {
  const res = await fetch("https://api.atlassian.com/me", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new UnauthorizedError("Failed to fetch Atlassian /me", {
      status: res.status,
      body,
    });
  }
  return (await res.json()) as AtlassianMe;
}

export async function getAccessibleResources(
  accessToken: string,
): Promise<AccessibleResource[]> {
  const res = await fetch(config.atlassian.accessibleResourcesUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new UnauthorizedError("Failed to fetch accessible resources", {
      status: res.status,
      body,
    });
  }
  return (await res.json()) as AccessibleResource[];
}
