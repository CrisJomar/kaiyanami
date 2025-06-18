import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import * as CartController from '../controllers/cartController';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';

const router = Router();

// Helper function for async request handlers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

// Add type assertion to bypass TypeScript's strict checking
const typedMiddleware = authMiddleware as any;

// Get user's cart
router.get('/', typedMiddleware, asyncHandler(CartController.getCart));

// Add item to cart
router.post('/items', typedMiddleware, asyncHandler(CartController.addItem));

// Update cart item quantity
router.put('/items/:itemId', typedMiddleware, asyncHandler(CartController.updateItemQuantity));

// Remove item from cart
router.delete('/items/:itemId', typedMiddleware, asyncHandler(CartController.removeItem));

// Clear cart
router.delete('/', typedMiddleware, asyncHandler(CartController.clearCart));

// Protected route
router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});



export default router;