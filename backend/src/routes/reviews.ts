import express from 'express';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';
import { PrismaClient } from '@prisma/client';

import asyncHandler from 'express-async-handler';

const router = express.Router();
const prisma = new PrismaClient();

// Get reviews for a product
router.get('/product/:productId', asyncHandler(async (req: any, res: any) => {
  const { productId } = req.params;

  const reviews = await prisma.review.findMany({
    where: { 
      productId,
      status: 'APPROVED' 
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true  // Changed from profileImage
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate average rating
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  res.json({
    reviews,
    average: parseFloat(avgRating.toFixed(1)),
    total: reviews.length
  });
}));

// Create a review for a product
router.post('/product/:productId', verifyToken, asyncHandler(async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { productId } = req.params;
  const { rating, title, content } = req.body;

  // Validate input
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating is required and must be between 1 and 5' });
  }

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Review content is required' });
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Check if user already reviewed this product
  const existingReview = await prisma.review.findUnique({
    where: {
      userId_productId: {
        userId: req.user.id,
        productId
      }
    }
  });

  if (existingReview) {
    return res.status(400).json({ message: 'You have already reviewed this product' });
  }

  // Create the review
  const review = await prisma.review.create({
    data: {
      userId: req.user.id,
      productId,
      rating,
      title,
      content,
      status: 'APPROVED' // Default to approved
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true 
        }
      }
    }
  });

  res.status(201).json(review);
}));

// Update a review
router.put('/:reviewId', verifyToken, asyncHandler(async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { reviewId } = req.params;
  const { rating, title, content } = req.body;

  // Find the review
  const review = await prisma.review.findUnique({
    where: { id: reviewId }
  });

  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  // Check ownership or admin status
  if (review.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to update this review' });
  }

  // Update the review
  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      rating: rating !== undefined ? rating : review.rating,
      title: title !== undefined ? title : review.title,
      content: content !== undefined ? content : review.content,
      // Reset to pending if content changed and moderation is needed
      // status: 'PENDING'
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        }
      }
    }
  });

  res.json(updatedReview);
}));

// Delete a review
router.delete('/:reviewId', verifyToken, asyncHandler(async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { reviewId } = req.params;

  // Find the review
  const review = await prisma.review.findUnique({
    where: { id: reviewId }
  });

  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  // Check ownership or admin status
  if (review.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to delete this review' });
  }

  // Delete the review
  await prisma.review.delete({
    where: { id: reviewId }
  });

  res.json({ message: 'Review deleted successfully' });
}));

// Admin routes for review management
router.get('/admin/pending', verifyToken, asyncHandler(async (req: any, res: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const pendingReviews = await prisma.review.findMany({
    where: { status: 'PENDING' },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      product: {
        select: {
          id: true,
          name: true,
          imageUrl: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  res.json(pendingReviews);
}));

// Admin approve/reject review
router.patch('/admin/:reviewId/status', verifyToken, asyncHandler(async (req: any, res: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { reviewId } = req.params;
  const { status } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: { status }
  });

  res.json(updatedReview);
}));

router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});

export default router;