import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import Stripe from "stripe";

import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./lib/logger";
import prisma from "./lib/prisma";

// ── Route imports ────────────────────────────────────────────────────────────
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import cartRoutes from "./routes/cart";
import orderRoutes from "./routes/orders";
import paymentRoutes from "./routes/payment";
import webhookRoutes from "./routes/webhook";
import adminRoutes from "./routes/admin";
import categoryRoutes from "./routes/category";
import uploadRoutes from "./routes/upload";
import emailRoutes from "./routes/email";
import supportRoutes from "./routes/support";
import wishlistRoutes from "./routes/wishlist";
import reviewRoutes from "./routes/reviews";
import analyticsRoutes from "./routes/analytics";
import addressRoutes from "./routes/addresses";
import userRoutes from "./routes/userRoutes";
import reportsRouter from "./routes/admin/reports";

// ── Stripe ───────────────────────────────────────────────────────────────────
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2023-10-16" as any,
  typescript: true,
});

const app = express();
const PORT = Number(process.env.PORT ?? 5001);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow serving uploaded images
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);

// ── Global rate limiter ────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

// ── Stripe webhook MUST receive raw body ─────────────────────────────────────
app.use("/api/webhook", express.raw({ type: "application/json" }));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.resolve("uploads")));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => { res.send("Backend is live 🚀"); });
app.get("/api/health", (_req, res) => { res.json({ status: "ok", uptime: process.uptime() }); });

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/upload", uploadRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin/reports", reportsRouter);

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`, {
    env: process.env.NODE_ENV ?? "development",
    port: PORT,
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down…`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Prisma disconnected. Bye 👋");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
