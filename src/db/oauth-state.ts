import { Timestamp } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";
import { db } from "./firestore";

export type OAuthProvider = "atlassian" | "gmail";

interface OAuthStateDoc {
  userId: string;
  provider: OAuthProvider;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

const COLLECTION = "oauth_states";
const TTL_MS = 10 * 60 * 1000;

const stateCol = () => db().collection(COLLECTION);

export async function createState(
  userId: string,
  provider: OAuthProvider,
): Promise<string> {
  const state = randomBytes(24).toString("base64url");
  const now = Date.now();
  const doc: OAuthStateDoc = {
    userId,
    provider,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + TTL_MS),
  };
  await stateCol().doc(state).set(doc);
  return state;
}

export async function consumeState(
  state: string,
  provider: OAuthProvider,
): Promise<{ userId: string } | null> {
  const ref = stateCol().doc(state);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as OAuthStateDoc;
  await ref.delete();

  if (data.provider !== provider) return null;
  if (data.expiresAt.toMillis() < Date.now()) return null;
  return { userId: data.userId };
}
