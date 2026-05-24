import { Router, RequestHandler } from "express";
import passport from "../config/passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import asyncHandler from "express-async-handler";
import { z } from "zod";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";
import authenticateToken from "../middleware/authMiddleware";
import { verifyToken } from "../utils/middlewareHelpers";
import { AuthController, changePassword } from "../controllers/authController";
import { sendEmail } from "../utils/emailService";

const router = Router();
const authController = new AuthController();

// ── Auth-specific rate limiter (stricter than global) ─────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again in 15 minutes." },
});

// ── Zod schemas ───────────────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── JWT helper ────────────────────────────────────────────────────────────────
/** Single source of truth for JWT payload shape. */
const signToken = (user: { id: string; email: string; role: string }, expiresIn = "7d") =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn } as any
  );

// ── Register ──────────────────────────────────────────────────────────────────
const registerHandler: RequestHandler = async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Validation failed", issues: parsed.error.errors });
    return;
  }

  const { email, password, firstName = "", lastName = "" } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), password: hashedPassword, firstName, lastName, role: "user" },
  });

  const token = signToken(user);
  logger.info("User registered", { userId: user.id });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  });
};

// ── Login ─────────────────────────────────────────────────────────────────────
const loginHandler: RequestHandler = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Validation failed", issues: parsed.error.errors });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user || !user.password) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user);
  logger.info("User logged in", { userId: user.id });
  res.json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  });
};

// ── Google OAuth callback ──────────────────────────────────────────────────────
const googleCallbackHandler: RequestHandler = (req, res) => {
  const user = req.user as any;
  if (!user) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    return;
  }

  const token = signToken(user, "7d");
  const redirectUrl = `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/auth/callback?token=${token}`;
  res.redirect(redirectUrl);
};

// ── Get current user (by token) ───────────────────────────────────────────────
const getMeHandler: RequestHandler = async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isVerified: true, avatar: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
};

// ── Update profile ─────────────────────────────────────────────────────────────
const updateProfileHandler: RequestHandler = async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { firstName, lastName, email } = req.body;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
    },
  });

  res.json({
    user: { id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName },
  });
};

// ── Send verification email ────────────────────────────────────────────────────
const sendVerificationEmailHandler: RequestHandler = async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.isVerified) {
    res.status(400).json({ error: "Email already verified" });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

  await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
  await prisma.verificationToken.create({ data: { token, userId: user.id, expiresAt } });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your email - Kaiyanami",
    text: `Hi ${user.firstName ?? user.email.split("@")[0]}, please verify your email: ${verificationUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#111">Verify your email address</h2>
        <p>Hi ${user.firstName ?? user.email.split("@")[0]},</p>
        <p>Click the button below to verify your email. The link expires in 24 hours.</p>
        <a href="${verificationUrl}"
           style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;
                  border-radius:6px;text-decoration:none;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#666;font-size:13px">Or paste this link in your browser:<br>${verificationUrl}</p>
        <p style="color:#999;font-size:12px">If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
  });

  logger.info("Verification email sent", { userId: user.id });
  res.json({ message: "Verification email sent" });
};

// ── Verify email ──────────────────────────────────────────────────────────────
const verifyEmailHandler: RequestHandler = async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) {
    res.status(400).json({ error: "Invalid verification token" });
    return;
  }
  if (new Date() > record.expiresAt) {
    await prisma.verificationToken.delete({ where: { id: record.id } });
    res.status(400).json({ error: "Verification token has expired" });
    return;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
    prisma.verificationToken.delete({ where: { id: record.id } }),
  ]);

  logger.info("Email verified", { userId: record.userId });
  res.json({ message: "Email verified successfully" });
};

// ── Routes ────────────────────────────────────────────────────────────────────
router.post("/register", authLimiter, asyncHandler(registerHandler));
router.post("/login", authLimiter, asyncHandler(loginHandler));

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  googleCallbackHandler
);

// Token validation
router.get("/validate", verifyToken, asyncHandler(async (req, res) => {
  await authController.validateToken(req, res);
}));

// Current user
router.get("/me", authenticateToken, asyncHandler(getMeHandler));
router.get("/user", authenticateToken, asyncHandler(getMeHandler));

// Profile
router.put("/update-profile", authenticateToken, asyncHandler(updateProfileHandler));

// Email verification
router.post("/send-verification-email", authenticateToken, asyncHandler(sendVerificationEmailHandler));
router.post("/send-verification", authenticateToken, asyncHandler(sendVerificationEmailHandler));
router.post("/verify-email", asyncHandler(verifyEmailHandler));

// Password
router.post("/change-password", verifyToken, asyncHandler(async (req, res) => {
  await changePassword(req, res);
}));
router.post("/forgot-password", authLimiter, asyncHandler(async (req, res) => {
  await authController.forgotPassword(req, res);
}));
router.get("/verify-reset-token/:token", asyncHandler(async (req, res) => {
  await authController.verifyResetToken(req, res);
}));
router.post("/reset-password", authLimiter, asyncHandler(async (req, res) => {
  await authController.resetPassword(req, res);
}));

export default router;
