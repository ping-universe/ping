import { config } from "../config/env";
import { BadRequestError, UnauthorizedError } from "../lib/errors";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export function buildGmailAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.gmail.oauthClientId,
    redirect_uri: config.gmail.oauthRedirectUri,
    response_type: "code",
    scope: config.gmail.scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    include_granted_scopes: "true",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGmailCode(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: config.gmail.oauthClientId,
    client_secret: config.gmail.oauthClientSecret,
    redirect_uri: config.gmail.oauthRedirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new BadRequestError("Gmail token exchange failed", {
      status: res.status,
      body: text,
    });
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function refreshGmailAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.gmail.oauthClientId,
    client_secret: config.gmail.oauthClientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new UnauthorizedError("Gmail token refresh failed", {
      status: res.status,
      body: text,
    });
  }
  return (await res.json()) as GoogleTokenResponse;
}
