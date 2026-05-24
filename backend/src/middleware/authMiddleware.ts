import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";

// ── Augment Express.User (Passport-compatible) ────────────────────────────────
// Passport already declares Express.Request.user as Express.User | undefined.
// We extend Express.User so all middleware sees consistent fields.
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
    }
  }
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Verifies the Bearer JWT and attaches the DB-fresh user to `req.user`.
 * Rejects the request with 401/403 on failure.
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ error: "Authentication token required" });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    // Always fetch a fresh copy so role changes take effect immediately
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn("Invalid token", { error: (err as Error).message });
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

/**
 * Requires that the authenticated user has the 'admin' role.
 * Must be used after `authenticateToken`.
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

export default authenticateToken;
