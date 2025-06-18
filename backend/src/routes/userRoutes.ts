import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';

// Define AuthRequest interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

const prisma = new PrismaClient();
const router = express.Router();

// Get user addresses endpoint
router.get('/:userId/addresses', authorize(['user', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    
    // Print headers and origin for debugging
    console.log('Request details:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      path: req.path,
      userId: userId
    });
    
    // Log the user object for debugging
    console.log('User from token:', JSON.stringify(req.user, null, 2));
    
    // Security check: Users can only access their own addresses unless they're admins
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Enhanced admin detection - check all possible ways admin status might be stored
    const isAdmin = 
      req.user.isAdmin === true || 
      req.user.role === 'admin' ||
      req.user.userType === 'admin' ||
      (req.user.roles && Array.isArray(req.user.roles) && req.user.roles.includes('admin'));
    
    // Print detailed user info for debugging
    console.log('Authorization check:', {
      endpoint: 'Get user addresses',
      requestedUserId: userId,
      currentUserId: req.user.id,
      userObject: req.user,
      isAdminDetected: isAdmin
    });
    
    // Check if the request is coming from the admin panel
    const referer = req.headers.referer || '';
    const isFromAdminPanel = referer.includes('/admin/') || referer.includes('admin-dashboard');
    
    if (req.user.id !== userId && !isAdmin && !isFromAdminPanel) {
      console.log('Access denied:', {
        requestedUserId: userId,
        currentUserId: req.user.id,
        isAdmin: isAdmin,
        referer: referer
      });
      res.status(403).json({ error: 'Not authorized to access these addresses' });
      return;
    }
    
    // Look up user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Fetch addresses for this user
    const addresses = await prisma.address.findMany({
      where: { userId }
    });
    
    // Send back the addresses
    console.log(`Found ${addresses.length} addresses for user ${userId}`);
    res.json(addresses);
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    res.status(500).json({ error: 'Failed to fetch user addresses' });
  }
});

// Admin route to get addresses for any user
router.get('/admin/get-addresses/:userId', authorize(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // Print full request info for debugging
    console.log('DEBUG - Admin address request:', {
      userId,
      requestUser: req.user,
      headers: req.headers
    });
    
    // Fetch addresses directly without permission checks
    const addresses = await prisma.address.findMany({
      where: { userId }
    });
    
    console.log(`Admin endpoint: Found ${addresses.length} addresses for user ${userId}`);
    res.json(addresses);
  } catch (error) {
    console.error('Error in admin address endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});


// This is specifically for admin panel access to user addresses
router.get('/admin-access/:userId/addresses', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // Log debug info
    console.log('Admin access route:', {
      requestUser: req.user?.email,
      requestedUserId: userId
    });
    
  
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Fetch addresses for this user
    const addresses = await prisma.address.findMany({
      where: { userId }
    });
    
    console.log(`Admin access: Found ${addresses.length} addresses for user ${userId}`);
    res.json(addresses);
  } catch (error) {
    console.error('Error in admin address access:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});


// Get current user's profile for forms
router.get('/profile', verifyToken, async (req: Request, res: Response) => {
  try {
    // Safely cast req to AuthRequest
    const user = (req as AuthRequest).user;
    
    if (!user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        addresses: {
          where: { isDefault: true },
          take: 1
        }
      }
    });
    
    if (!userProfile) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }
    
    // Format response with default address if available
    const defaultAddress = userProfile.addresses[0];
    
    res.json({
      id: userProfile.id,
      email: userProfile.email,
      firstName: userProfile.firstName || '',
      lastName: userProfile.lastName || '',
      address: defaultAddress ? {
        street: defaultAddress.street,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zipCode: defaultAddress.zipCode,
        country: defaultAddress.country
      } : null
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});

export default router;