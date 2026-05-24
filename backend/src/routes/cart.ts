import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import * as CartController from '../controllers/cartController';
import { auth } from '../utils/middlewareHelpers';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

// GET  /api/cart            — fetch current user's cart
router.get('/',                       auth, asyncHandler(CartController.getCart));

// POST /api/cart/add        — add an item (or increment qty if already in cart)
router.post('/add',                   auth, asyncHandler(CartController.addToCart));

// PUT  /api/cart/update/:cartItemId  — set a new quantity on one cart item
router.put('/update/:cartItemId',     auth, asyncHandler(CartController.updateCartItem));

// DELETE /api/cart/remove/:cartItemId — remove one item from the cart
router.delete('/remove/:cartItemId',  auth, asyncHandler(CartController.removeCartItem));

// DELETE /api/cart/clear    — empty the whole cart
router.delete('/clear',               auth, asyncHandler(CartController.clearCart));

// POST /api/cart/migrate    — merge anonymous (local-storage) cart into DB cart on login
router.post('/migrate',               auth, asyncHandler(CartController.migrateAnonymousCart));

export default router;
