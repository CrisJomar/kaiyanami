import authMiddleware from '../middleware/authMiddleware';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

// Export auth as an alias for authMiddleware
export const auth = authMiddleware as RequestHandler;

// Verify JWT token middleware
export const verifyToken: RequestHandler = (req, res, next): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log("❌ No token provided");
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    console.log("✅ Token decoded:", decoded);
    
    // Attach to req.user
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    console.error("❌ Invalid token:", error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Create proper optionalAuth middleware that won't be undefined
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to verify the token but don't reject if it fails
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, but that's okay - continue as guest
      req.user = undefined;
      return next();
    }
    
    try {
      // Use the regular auth middleware but catch any errors
      (authMiddleware as any)(req, res, (err?: any) => {
        if (err) {
          // Token invalid but continue anyway
          req.user = undefined;
        }
        // Otherwise req.user was set by authMiddleware
        next();
      });
    } catch (error) {
      // If anything goes wrong, just proceed as guest
      req.user = undefined;
      next();
    }
  } catch (error) {
    // Failsafe - always continue the request
    req.user = undefined;
    next();
  }
};

// Add the role-based authorization middleware
export const authorize = (roles: string[]): RequestHandler => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ message: 'Unauthorized access' });
  };
};

// Update your isAdmin middleware to ensure it properly calls next() or returns
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // Check if user is admin
  const user = req.user as any; 
  
  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return; 
  }
  
  if (user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
    return; 
  }
  
  // User is admin, proceed
  next();
};

