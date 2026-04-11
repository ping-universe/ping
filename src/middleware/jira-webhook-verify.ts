import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import express from "express";
import { config } from "../config/env";
import { UnauthorizedError } from "../lib/errors";

// Capture the raw request body so we can recompute the HMAC exactly.
// Must be mounted BEFORE the JSON body parser on this route.
export const jiraRawBody = express.raw({ type: "application/json", limit: "2mb" });

export function verifyJiraSignature(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const signatureHeader = req.header("x-hub-signature");
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return next(new UnauthorizedError("Missing or malformed X-Hub-Signature"));
  }
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    return next(new UnauthorizedError("Raw body unavailable for signature check"));
  }

  const expected = crypto
    .createHmac("sha256", config.atlassian.webhookSecret)
    .update(raw)
    .digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new UnauthorizedError("Invalid Jira webhook signature"));
  }

  try {
    req.body = JSON.parse(raw.toString("utf-8"));
    next();
  } catch {
    next(new UnauthorizedError("Invalid JSON body"));
  }
}
