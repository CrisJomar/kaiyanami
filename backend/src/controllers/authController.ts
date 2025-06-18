import { Request, RequestHandler, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import emailService, { sendEmail } from '../utils/emailService'; 
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthController {
  public validateToken = async (req: any, res: Response) => {
    try {
      // The user object should already be available from the verifyToken middleware
      const userId = req.user?.id;
      
      if (!userId) {
        console.log("❌ Invalid token: no user ID found");
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Get complete user data from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          createdAt: true,
          avatar: true
        }
      });

      if (!user) {
        console.log("❌ User not found for ID:", userId);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log("✅ Token validation successful for:", user.email);
      
      // Return the user object directly
      return res.status(200).json({ 
        user: user,
        isAuthenticated: true 
      });
    } catch (error) {
      console.error("❌ Error validating token:", error);
      return res.status(500).json({ message: 'Server error during token validation' });
    }
  }

  // Existing Google login method
  static async googleLogin(req: Request, res: Response) {
  
  }

  // Regular user registration
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        console.log("❌ User already exists:", email);
        return res.status(400).json({ message: "User already exists" });
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
      
      // Generate token - consistent with your googleLogin method
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || "default-secret",
        { expiresIn: "7d" }
      );
      
      console.log("✅ Registration successful for:", email);
      return res.status(201).json({ token, user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }});
    } catch (error) {
      console.error("❌ Error in register:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // Regular user login
  static async login(req: Request, res: Response) {
    try {
      console.log("Login attempt with data:", req.body);
      
      const { email, password } = req.body;
      
      // Validate email and password are present
      if (!email) {
        console.error("Email is missing or undefined");
        return res.status(400).json({ message: 'Email is required' });
      }
      
      if (!password) {
        console.error("Password is missing or undefined");
        return res.status(400).json({ message: 'Password is required' });
      }
      
      try {
        console.log(`Looking up user in database with email: "${email}"`);
        
        // Find user by email - wrapped in try/catch to catch database errors
        const user = await prisma.user.findUnique({
          where: { 
            email: email.trim().toLowerCase() // Ensure email is properly formatted
          },
        });
        
        console.log("Database lookup complete. User found:", user ? "Yes" : "No");
        
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Check password
        console.log("Checking password...");
        if (!user.password) {
          console.log("User has no password set");
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        console.log("Comparing passwords...");
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("Password comparison complete. Valid:", isPasswordValid ? "Yes" : "No");
        
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Generate token - consistent with your googleLogin method
        console.log("Generating JWT token...");
        const token = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.JWT_SECRET || "default-secret",
          { expiresIn: "7d" }
        );
        
        console.log("✅ Login successful for:", email);
        return res.json({ 
          token, 
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        });
      } catch (dbError) {
        console.error("Database error during login:", dbError);
        return res.status(500).json({ message: "Database error", error: dbError instanceof Error ? dbError.message : String(dbError) });
      }
    } catch (error) {
      console.error("❌ Error in login:", error);
      return res.status(500).json({ 
        message: "Server error", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  // Get user profile
  static async getUser(req: any, res: Response) {
    try {
      // req.user should be populated by verifyToken middleware
      if (!req.user || !req.user.userId) {
        console.log("❌ Missing user ID in token");
        return res.status(401).json({ message: "Invalid token" });
      }
      
      const userId = req.user.userId;
      console.log("🔍 Fetching user data for ID:", userId);
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          email: true, 
          firstName: true, 
          lastName: true, 
          role: true,
          createdAt: true 
        },
      });
      
      if (!user) {
        console.log("❌ User not found for ID:", userId);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("✅ User data retrieved for:", user.email);
      return res.json(user);
    } catch (error) {
      console.error("❌ Error in getUser:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // Send verification email 
  static async sendVerificationEmail(req: Request, res: Response) {
    try {
      // Get user ID from the authenticated request
      const userId = (req as any).user.id;
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Generate JWT token instead of storing in database
      const verificationToken = jwt.sign(
        { 
          userId: user.id,
          purpose: 'email_verification' 
        },
        process.env.JWT_SECRET || "default-secret",
        { expiresIn: "24h" } // 24 hour expiration
      );
      
      // Create verification URL with the JWT token
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
      
      console.log("Sending verification email to:", user.email);
      console.log("Verification URL:", verifyUrl);
      
      // Send email
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address',
        text: `Please verify your email address by visiting: ${verifyUrl}. This link will expire in 24 hours.`,
        html: `
          <h1>Email Verification</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verifyUrl}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `
      });
      
      res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
      console.error('Error sending verification email:', error);
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  }

  // Add a new method to verify the email
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }
      
      // Verify the JWT token
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || "default-secret"
      ) as { userId: string; purpose: string };
      
      // Make sure this is an email verification token
      if (decoded.purpose !== 'email_verification') {
        return res.status(400).json({ error: 'Invalid verification token' });
      }
      
      // Update the user's email verification status
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          isVerified: true
        }
      });
      
      return res.json({ message: 'Email verified successfully' });
    } catch (error) {
      console.error('Error verifying email:', error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }
      
      return res.status(500).json({ error: 'Failed to verify email' });
    }
  }

  public forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
  
      // Find user by email
      const user = await prisma.user.findUnique({ where: { email } });
      
      // Don't reveal if user exists for security reasons
      if (!user) {
        return res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
      }
  
      // Generate a token with 1-hour expiry
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Hash the token before storing in DB
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Update user with the reset token
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          resetToken: hashedToken,
          resetTokenExpiry
        }
      });
      
      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      
      // Send email with reset link
      await sendEmail({
        to: user.email,
        subject: 'Password Reset',
        text: `You requested a password reset. Click the link below to reset your password. This link is valid for 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
        html: `
          <p>You requested a password reset.</p>
          <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
          <a href="${resetUrl}" style="background:#3b82f6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;margin:20px 0;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });
      
      return res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
      
    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  public verifyResetToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Hash the token to compare with DB
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // Find user with this token and valid expiry
      const user = await prisma.user.findFirst({
        where: {
          resetToken: hashedToken,
          resetTokenExpiry: {
            gt: new Date() // Token is not expired
          }
        }
      });
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
      
      return res.status(200).json({ message: 'Token is valid' });
      
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  public resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      
      // Hash the token to compare with DB
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // Find user with this token and valid expiry
      const user = await prisma.user.findFirst({
        where: {
          resetToken: hashedToken,
          resetTokenExpiry: {
            gt: new Date() // Token is not expired
          }
        }
      });
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user with new password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });
      
      return res.status(200).json({ message: 'Password has been reset successfully' });
      
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}


// Make sure validateToken returns the complete user object
export const validateToken = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      console.log("❌ No user ID in token");
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Get COMPLETE user info - make sure to include firstName and lastName
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        avatar: true,
        createdAt: true
        // Never include password
      }
    });
    
    if (!user) {
      console.log(`❌ User ID ${userId} not found in database`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`✅ Token validation successful for: ${user.email}`);
    
    // Return COMPLETE user object
    return res.json({
      user,
      isAuthenticated: true
    });
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update your login handler
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Add debug logging
    console.log(`🔍 Login attempt for email: ${email}`);
    
    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email (case insensitive)
    const user = await prisma.user.findFirst({
      where: { 
        email: { 
          equals: email, 
          mode: 'insensitive' // Use case-insensitive matching
        } 
      }
    });
    
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log(`✅ Found user: ${user.email}`);
    
    // Check if password exists
    if (!user.password) {
      console.log('❌ User has no password set');
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('✅ Password match successful');
    
    // Create and sign JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-default-secret',
      { expiresIn: '7d' }
    );
    
    // Prepare user data (exclude password)
    const { password: _, ...userData } = user;
    
    console.log(`✅ Login successful for user: ${user.email}`);
    
    // Return token and user data
    return res.json({
      token,
      user: userData
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// Add this function to your authController.ts

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if password exists
    if (!user.password) {
      return res.status(400).json({ message: 'No password is set for this user' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};