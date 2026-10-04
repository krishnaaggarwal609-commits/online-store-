import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = (err as { status?: number }).status || 500;
  const message =
    status >= 500
      ? "Something went wrong. Please try again."
      : (err as Error).message || "Request failed";
  if (status >= 500) logger.error("server error", { err: String(err) });
  res.status(status).json({
    error: message,
    details: (err as HttpError).details,
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}
