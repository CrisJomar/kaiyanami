import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import passport from "../config/passport";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import authMiddleware from '../middleware/authMiddleware';
import crypto from "crypto";
import nodemailer from "nodemailer";
import asyncHandler from 'express-async-handler';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';
import express from 'express';
import { AuthController, changePassword } from '../controllers/authController';

const router = Router();
const prisma = new PrismaClient();
const authController = new AuthController();

// Define types for request handlers

// Add these TypeScript interfaces
interface VerificationEmailRequest {
  userId: string;
}

interface VerifyEmailRequest {
  token: string;
}

// Helper function to generate a JWT token - STANDARDIZE THIS
const generateToken = (user: any): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "default-secret",
    { expiresIn: "24h" }
  );
};

// Configure email transport - add below your other const declarations
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Type assertion helper for middleware
const typedMiddleware = authMiddleware as any;

const registerHandler: RequestHandler = async (req, res) => {
  try {
    console.log("Registration attempt:", req.body.email);
    const { email, password, firstName, lastName } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      console.log("❌ User already exists:", email);
      res.status(400).json({ message: "User already exists" });
      return;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'customer'
      },
    });
    
    // Generate token
    const token = generateToken(user);
    
    console.log("✅ Registration successful for:", email);
    res.status(201).json({ token });
    
  } catch (error) {
    console.error("❌ Error in /register:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const loginHandler: RequestHandler = async (req, res) => {
  try {
    console.log("Login attempt for:", req.body.email);
    const { email, password } = req.body;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user || !user.password) {
      console.log("❌ Invalid credentials for:", email);
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    
    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log("❌ Invalid password for:", email);
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    
    // Generate token
    const token = generateToken(user);
    
    console.log("✅ Login successful for:", email);
    console.log("User role:", user.role); // Log the role
    res.json({ token, user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role // Return the role with the response
    }});
  } catch (error) {
    console.error("❌ Error in /login:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const googleCallbackHandler: RequestHandler = (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      console.log("❌ No user data from Google OAuth");
      res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
      return;
    }
    
    console.log("✅ Google authentication successful for:", user.email);
    
    // Generate JWT with CONSISTENT FORMAT - use id not userId
    const token = jwt.sign(
      { 
        id: user.id,  // CHANGED: userId -> id for consistency
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    // Make sure FRONTEND_URL is set in your .env
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`;
    console.log('🔹 Redirecting to:', redirectUrl);

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("❌ Error in /google/callback:", error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

const getUserHandler: RequestHandler = async (req: any, res) => {
  try {
    // req.user should be populated by verifyToken middleware
    if (!req.user || !req.user.id) {
      console.log("❌ Missing user ID in token");
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    const userId = req.user.id;
    console.log("🔍 Fetching user data for ID:", userId);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      }
    });

    if (!user) {
      console.log("❌ User not found for ID:", userId);
      res.status(404).json({ message: "User not found" });
      return;
    }

    console.log("✅ User data retrieved for:", user.email);
    console.log("User role:", user.role); // Log the role
    res.json(user);
  } catch (error) {
    console.error("❌ Error in GET /user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Middleware to authenticate token
const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret") as any;
    (req as any).userId = decoded.id;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
};
const verifyTokenHandler: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.json({ valid: false });
      return;
    }
    
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET || "default-secret");
    
    res.json({ valid: true });
  } catch (error) {
    res.json({ valid: false });
  }
};

// Send verification email handler - add this fallback code to extract userId
const sendVerificationEmailHandler: RequestHandler = async (req: any, res) => {
  try {
    console.log("DEBUG - Request object:", {
      user: req.user,
      userId: req.userId,
      hasToken: !!req.headers.authorization
    });
    
    // Enhanced user ID extraction with fallback to token
    let userId = req.user?.id || req.userId;
    
    // If userId is still missing, try to extract from token directly
    if (!userId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret") as any;
        userId = decoded.id;
        console.log("Extracted userId from token:", userId);
        
        // Attach it to req for future middleware
        req.userId = userId;
        if (!req.user) req.user = { id: userId };
      } catch (error) {
        console.error("Error extracting userId from token:", error);
      }
    }
    
    console.log("Using userId:", userId);
    
    if (!userId) {
      console.log("❌ Missing userId in request");
      res.status(400).json({ error: "Authentication required" });
      return;
    }
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    console.log("🔍 User found:", user);
    console.log("🔍 User fields:", Object.keys(user || {}));
    console.log("🔍 isVerified field value:", user?.isVerified);
    
    if (!user) {
      console.log("❌ User not found:", userId);
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    // Check for the isVerified field more carefully
    if (user.isVerified === undefined) {
      console.log("⚠️ isVerified field is undefined on user:", userId);
      // Continue anyway since we want to add this field
    } else if (user.isVerified === true) {
      console.log("❌ Email already verified for:", user.email);
      res.status(400).json({ error: "Email already verified" });
      return;
    }
    
    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24h
    
    // Delete any existing tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id }
    });
    
    // Create a new verification token
    await prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });
    
    // Generate the verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    console.log("🔗 Verification URL:", verificationUrl);
    
    // Send the verification email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Kaiyanami" <noreply@kaiyanami.com>',
      to: user.email,
      subject: "Verify your email address",
      html: `
        <div style="padding: 20px; max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Verify your email address</h2>
          <p>Hi ${user.firstName || user.email.split('@')[0]},</p>
          <p>Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <p>Best regards,<br>Kaiyanami Team</p>
        </div>
      `
    });
    
    console.log("✅ Verification email sent to:", user.email);
    res.json({ success: true, message: "Verification email sent" });
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    res.status(500).json({ error: "Failed to send verification email" });
  }
};

// Verify email handler
const verifyEmailHandler: RequestHandler = async (req, res) => {
  try {
    const { token } = req.body as VerifyEmailRequest;
    
    console.log("🔹 Verifying email with token:", token);
    
    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });
    
    if (!verificationToken) {
      console.log("❌ Invalid verification token:", token);
      res.status(400).json({ error: "Invalid verification token" });
      return;
    }
    
    // Check if token is expired
    if (new Date() > verificationToken.expiresAt) {
      console.log("❌ Verification token expired:", token);
      try {
        await prisma.verificationToken.delete({
          where: { id: verificationToken.id }
        });
      } catch (deleteError) {
        console.log("Warning: Could not delete expired token:", deleteError);
        // Continue anyway as the main goal is to return the error to the user
      }
      res.status(400).json({ error: "Verification token expired" });
      return;
    }
    
    const userId = verificationToken.userId;
    
    // Update user's email verification status in a transaction along with token deletion
    try {
      // Use a transaction to ensure both operations succeed or fail together
      const result = await prisma.$transaction([
        // Update the user first
        prisma.user.update({
          where: { id: userId },
          data: { isVerified: true }
        }),
        // Then delete the token
        prisma.verificationToken.delete({
          where: { id: verificationToken.id }
        })
      ]);
      
      const user = result[0]; // The updated user
      console.log("✅ Email verified for user:", user.email);
      
      res.json({ success: true, message: "Email verified successfully" });
    } catch (txError) {
      console.error("Transaction error:", txError);
      
      // Handle specific case of token already deleted
      if (typeof txError === 'object' && txError !== null && 'code' in txError && txError.code === 'P2025') {
        // Check if the user was updated despite the token error
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (user?.isVerified) {
          console.log("✅ Email already verified for user:", user.email);
          res.json({ success: true, message: "Email verified successfully" });
        } else {
          res.status(500).json({ error: "Failed to verify email" });
        }
        return;
      }
      
      throw txError; // Re-throw for the outer catch to handle
    }
  } catch (error) {
    console.error("❌ Error verifying email:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
};

// Update profile endpoint
router.put('/update-profile', typedMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    const { firstName, lastName, email } = req.body;
    
    console.log('Update request received:', { userId, firstName, lastName, email });
    
    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email })
      }
    });
    
    console.log('User updated successfully:', updatedUser);
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile',
      error: String(error)
    });
  }
});

// Add this new endpoint for getting current user info
router.get('/me', typedMiddleware, asyncHandler(async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true, // Make sure this matches your schema field name
      createdAt: true
    }
  });
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  res.json(user);
}));

// Register routes
router.post("/login", loginHandler);
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  googleCallbackHandler
);
router.get("/user", typedMiddleware, getUserHandler);
router.get("/verify-token", verifyTokenHandler);
router.post("/register", registerHandler);
router.post("/send-verification-email", sendVerificationEmailHandler);
router.post("/verify-email", verifyEmailHandler);
router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});
router.post("/send-verification", typedMiddleware, sendVerificationEmailHandler);
router.get('/validate', verifyToken, asyncHandler(async (req, res) => {
  await authController.validateToken(req, res);
}));
router.post('/change-password', verifyToken, asyncHandler(async (req, res) => {
  await changePassword(req, res);
}));

// Password reset routes
router.post('/forgot-password', asyncHandler(async (req, res) => {
  await authController.forgotPassword(req, res);
}));
router.get('/verify-reset-token/:token', asyncHandler(async (req, res) => {
  await authController.verifyResetToken(req, res);
}));
router.post('/reset-password', asyncHandler(async (req, res) => {
  await authController.resetPassword(req, res);
}));
export default router;