import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { auth } from '../utils/middlewareHelpers';
import * as paymentModule from '../controllers/paymentController';

const router = express.Router();

// Create wrapper function to handle controllers that return Promise<Response|void>
const asyncHandler = (fn: (req: Request, res: Response, next?: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Use the asyncHandler wrapper for cleaner code
router.post('/create-intent', asyncHandler(paymentModule.default.createPaymentIntent));
router.post('/create-order', asyncHandler(paymentModule.createOrder));
router.post('/webhook', asyncHandler(paymentModule.default.handleWebhook));

router.get('/order/:orderId', asyncHandler((req: Request, res: Response) => {
  console.log("Order lookup request received for:", req.params.orderId);
  return paymentModule.default.getOrder(req, res);
}));

router.post('/send-confirmation-email', asyncHandler(paymentModule.default.sendConfirmationEmail));

// Protected route example
router.get('/protected-route', auth, (req: Request, res: Response) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

export default router;