import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config/env";
import { logger } from "../lib/logger";
import {
  DEFAULT_BRIEFING,
  type AtlassianConnection,
  type GmailConnection,
  type UserDoc,
} from "../types/user";

let app: App | undefined;
let dbInstance: Firestore | undefined;

function initFirebase(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const credPath = path.resolve(config.google.credentials);
  if (!fs.existsSync(credPath)) {
    throw new Error(
      `Service account key not found at ${credPath}. Set GOOGLE_APPLICATION_CREDENTIALS.`,
    );
  }
  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf-8"));

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: config.firebase.projectId,
  });
  logger.info({ projectId: config.firebase.projectId }, "firebase-admin initialized");
  return app;
}

export function db(): Firestore {
  if (dbInstance) return dbInstance;
  initFirebase();
  dbInstance = getFirestore();
  dbInstance.settings({ ignoreUndefinedProperties: true });
  return dbInstance;
}

const USERS = "users";

export const userRef = (userId: string) => db().collection(USERS).doc(userId);

export async function getUser(userId: string): Promise<UserDoc | null> {
  const snap = await userRef(userId).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

export async function upsertUser(
  userId: string,
  patch: Partial<UserDoc>,
): Promise<void> {
  const ref = userRef(userId);
  const now = Timestamp.now();
  await ref.set(
    {
      userId,
      briefing: DEFAULT_BRIEFING,
      createdAt: now,
      ...patch,
      updatedAt: now,
    },
    { merge: true },
  );
}

export async function setAtlassianConnection(
  userId: string,
  conn: AtlassianConnection,
): Promise<void> {
  await upsertUser(userId, { atlassian: conn });
}

export async function setGmailConnection(
  userId: string,
  conn: GmailConnection,
): Promise<void> {
  await upsertUser(userId, { gmail: conn });
}

export async function clearAtlassian(userId: string): Promise<void> {
  await userRef(userId).update({
    atlassian: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });
}

export async function clearGmail(userId: string): Promise<void> {
  await userRef(userId).update({
    gmail: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });
}
