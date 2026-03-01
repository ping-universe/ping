import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Google
  googleProjectId: process.env.GOOGLE_PROJECT_ID || "",
  googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",

  // Jira
  jiraBaseUrl: process.env.JIRA_BASE_URL || "https://hancom.atlassian.net",
  jiraApiToken: process.env.JIRA_API_TOKEN || "",
  jiraUserEmail: process.env.JIRA_USER_EMAIL || "",

  // Gmail Pub/Sub
  gmailPubsubTopic: process.env.GMAIL_PUBSUB_TOPIC || "",
  gmailPubsubSubscription: process.env.GMAIL_PUBSUB_SUBSCRIPTION || "",

  // Firebase
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
} as const;
