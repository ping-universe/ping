import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Not Found", path: req.path, requestId: req.id });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    logger.warn(
      { requestId: req.id, status: err.status, err: err.message, details: err.details },
      "http error",
    );
    res.status(err.status).json({
      error: err.message,
      details: err.details,
      requestId: req.id,
    });
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  logger.error({ requestId: req.id, err: message }, "unhandled error");
  res.status(500).json({ error: "Internal Server Error", requestId: req.id });
}
