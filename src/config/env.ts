import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  BASE_URL: z.string().url(),

  GOOGLE_CLOUD_PROJECT_ID: z.string().min(1),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),

  ATLASSIAN_CLIENT_ID: z.string().min(1),
  ATLASSIAN_CLIENT_SECRET: z.string().min(1),
  ATLASSIAN_REDIRECT_URI: z.string().url(),

  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  GMAIL_PUBSUB_TOPIC: z.string().min(1),
  GMAIL_PUBSUB_AUDIENCE: z.string().url().optional(),

  OPENROUTER_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`[config] Invalid environment variables:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProd: env.NODE_ENV === "production",
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  baseUrl: env.BASE_URL,

  google: {
    projectId: env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
  },
  atlassian: {
    clientId: env.ATLASSIAN_CLIENT_ID,
    clientSecret: env.ATLASSIAN_CLIENT_SECRET,
    redirectUri: env.ATLASSIAN_REDIRECT_URI,
    scopes: [
      "read:jira-user",
      "read:jira-work",
      "write:jira-work",
      "offline_access",
    ],
    authorizeUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    accessibleResourcesUrl: "https://api.atlassian.com/oauth/token/accessible-resources",
  },
  gmail: {
    oauthClientId: env.GOOGLE_OAUTH_CLIENT_ID,
    oauthClientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    oauthRedirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
    pubsubTopic: env.GMAIL_PUBSUB_TOPIC,
    pubsubAudience: env.GMAIL_PUBSUB_AUDIENCE ?? env.BASE_URL,
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.metadata",
    ],
  },
  openrouter: {
    apiKey: env.OPENROUTER_API_KEY,
  },
} as const;

export type AppConfig = typeof config;
