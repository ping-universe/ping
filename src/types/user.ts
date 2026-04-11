import { Timestamp } from "firebase-admin/firestore";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  scope: string;
  tokenType: string;
}

export interface AtlassianConnection extends OAuthTokens {
  // Cloud id returned from accessible-resources — required for Jira REST calls
  cloudId: string;
  siteUrl: string;
}

export interface GmailConnection extends OAuthTokens {
  emailAddress: string;
  // historyId from users.watch() response — baseline for Pub/Sub diffs
  historyId: string;
  // watch() expires after 7 days; scheduler renews before this
  watchExpiresAt: Timestamp;
}

export interface BriefingSettings {
  enabled: boolean;
  // "HH:mm" in the user's local timezone
  time: string;
  timezone: string;
  weekdaysOnly: boolean;
}

export interface UserDoc {
  // Google Chat user resource name: "users/{id}"
  userId: string;
  // Google Chat DM space for this user: "spaces/{id}"
  dmSpaceId?: string;
  displayName?: string;
  email?: string;

  atlassian?: AtlassianConnection;
  gmail?: GmailConnection;

  briefing: BriefingSettings;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const DEFAULT_BRIEFING: BriefingSettings = {
  enabled: true,
  time: "09:00",
  timezone: "Asia/Seoul",
  weekdaysOnly: true,
};
