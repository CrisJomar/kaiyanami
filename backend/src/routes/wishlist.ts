import express from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import { auth, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's wishlist
router.get('/', auth, asyncHandler(async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const wishlist = await prisma.wishlist.findMany({
    where: { userId: req.user.id },
    include: {
      product: {
        include: {
          // Include Imgaes
          category: true
          
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(wishlist);
}));

// Add product to wishlist
router.post('/:productId', auth, asyncHandler(async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { productId } = req.params;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Check if already in wishlist
  const existingItem = await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId: req.user.id,
        productId
      }
    }
  });

  if (existingItem) {
    return res.json({ message: 'Product already in wishlist', wishlistItem: existingItem });
  }

  // Add to wishlist
  const wishlistItem = await prisma.wishlist.create({
    data: {
      userId: req.user.id,
      productId
    },
    include: {
      product: true
    }
  });

  res.status(201).json(wishlistItem);
}));

// Remove from wishlist
router.delete('/:productId', auth, asyncHandler(async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { productId } = req.params;

  const wishlistItem = await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId: req.user.id,
        productId
      }
    }
  });

  if (!wishlistItem) {
    return res.status(404).json({ message: 'Item not in wishlist' });
  }

  await prisma.wishlist.delete({
    where: {
      userId_productId: {
        userId: req.user.id,
        productId
      }
    }
  });

  res.json({ message: 'Product removed from wishlist' });
}));

router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});

export default router;