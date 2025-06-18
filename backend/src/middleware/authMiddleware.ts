import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express's Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    // Use a simple interface instead of the imported type
    interface DecodedToken {
      id: string;
      email: string;
      role?: string;
      [key: string]: any;
    }

    // Verify the token with the inline type
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    ) as DecodedToken;
    
    console.log("Token decoded:", decoded);
    
    // Fetch the full user data including role
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("User found:", user);
    
    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  // Check that req.user exists and has the required fields
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Debug what's in the token
  console.log("Auth check - User data from token:", req.user);
  
  // IMPORTANT: Check both possibilities - userId OR id
  const userRole = req.user.role;
  
  if (userRole !== 'admin') {
    console.log(`Access denied: User role ${userRole} attempted admin access`);
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

export default authenticateToken;