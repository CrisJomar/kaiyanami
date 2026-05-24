/**
 * Re-exports auth middleware so route files can import from one place.
 *
 * Usage:
 *   import { auth, verifyToken, optionalAuth, isAdmin } from '../utils/middlewareHelpers';
 */

import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/authMiddleware";
import { logger } from "../lib/logger";

/** Require a valid JWT (401/403 on failure). */
export const auth: RequestHandler = authenticateToken as RequestHandler;

/** Alias kept for backward compatibility. */
export const verifyToken: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };
    (req as any).user = decoded;
    next();
  } catch (err) {
    logger.warn("verifyToken: invalid token", { error: (err as Error).message });
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Optional auth — populates req.user if a valid token is present,
 * but never rejects the request (allows guest access).
 */
export const optionalAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };
    (req as any).user = decoded;
  } catch {
    // Invalid token → continue as guest
  }
  next();
};

/** Require the 'admin' role (must come after auth/verifyToken). */
export const isAdmin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user as any;
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (user.role !== "admin") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return;
  }
  next();
};

/** Generic role-based authorization factory. */
export const authorize = (roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as any;
    if (!user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ message: "Unauthorized access" });
      return;
    }
    next();
  };
};
