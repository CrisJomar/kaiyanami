import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import path from 'path';

// Route imports
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payment';
import cartRoutes from './routes/cart';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import productRoutes from './routes/products';
import uploadRoutes from './routes/upload';
import categoryRoutes from './routes/category';
import productController from './controllers/productController';
import emailRoutes from './routes/email';
import supportRoutes from './routes/support';
import wishlistRoutes from './routes/wishlist';
import reviewRoutes from './routes/reviews';
import analyticsRoutes from './routes/analytics';
import addressRoutes from './routes/addresses';
import userRoutes from './routes/userRoutes';
import reportsRouter from './routes/admin/reports';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
  typescript: true
});

// ✅ Updated CORS: allow local + deployed frontend
app.use(cors({
  origin: (origin, callback) => {
    const whitelist = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://your-frontend.vercel.app' // ⬅️ replace with your real deployed frontend
    ];
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Updated static file path for Render compatibility
app.use('/upload', express.static(path.resolve('upload')));

// Main API routes
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin/reports', reportsRouter);
app.use('/api/upload', uploadRoutes);

// ✅ Use dynamic import to avoid require() error in ESM
app.use('/api/orders/create-order', async (req, res, next) => {
  const { default: createOrderHandler } = await import('./routes/orderCreate.js');
  return createOrderHandler(req, res, next);
});

// Controller-based route
app.get('/api/products', productController.getAll);

// ✅ Root route for Render health check
app.get('/', (req, res) => {
  res.send('Backend is live 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Global error handler
interface ErrorWithStack extends Error {
  stack?: string;
}

const errorHandler: ErrorRequestHandler = (err: ErrorWithStack, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
};

app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
