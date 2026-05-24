import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(422).json({
      error: "Validation failed",
      issues: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Known operational errors (thrown intentionally via AppError)
  if (err instanceof AppError) {
    logger.warn("Operational error", { message: err.message, statusCode: err.statusCode });
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unknown errors — log stack in dev, hide it in prod
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  logger.error("Unhandled error", {
    message,
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : message,
  });
};
