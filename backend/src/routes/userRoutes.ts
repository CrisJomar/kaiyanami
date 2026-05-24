import { logger } from '../lib/logger';
import express from 'express';
import prisma from '../lib/prisma';
import { Request, Response } from 'express';
import { auth, verifyToken, authorize } from '../utils/middlewareHelpers';

// req.user is typed globally via Express.User in authMiddleware.ts

const router = express.Router();

// ── GET /api/users/:userId/addresses ──────────────────────────────────────────
// Users can only fetch their own addresses; admins can fetch anyone's.
router.get('/:userId/addresses', authorize(['user', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userIsAdmin = req.user.role === 'admin';

    if (req.user.id !== userId && !userIsAdmin) {
      res.status(403).json({ error: 'Not authorized to access these addresses' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const addresses = await prisma.address.findMany({ where: { userId } });
    res.json(addresses);
  } catch (error) {
    logger.error('Error fetching user addresses:', error);
    res.status(500).json({ error: 'Failed to fetch user addresses' });
  }
});

// ── GET /api/users/profile ────────────────────────────────────────────────────
router.get('/profile', verifyToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!userProfile) {
      res.status(404).json({ message: 'User profile not found' });
      return;
    }

    const defaultAddress = userProfile.addresses[0];

    res.json({
      id: userProfile.id,
      email: userProfile.email,
      firstName: userProfile.firstName || '',
      lastName: userProfile.lastName || '',
      address: defaultAddress
        ? {
            street: defaultAddress.street,
            city: defaultAddress.city,
            state: defaultAddress.state,
            zipCode: defaultAddress.zipCode,
            country: defaultAddress.country,
          }
        : null,
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
