import express from 'express';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';
import { Request, Response } from 'express';
import analyticsController from '../controllers/analyticsController';
import asyncHandler from 'express-async-handler';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Simple route that will definitely work - no dependencies
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Analytics API is working',
    status: 'ok'
  });
});


router.get('/dashboard', (req: Request, res: Response) => {
  const getData = async () => {
    try {
      // Basic dashboard data
      const totalOrders = await prisma.order.count();
      const totalRevenue = await prisma.order.aggregate({
        _sum: { total: true }
      });
      
      res.json({
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        message: "Dashboard data retrieved successfully"
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Error fetching dashboard data" });
    }
  };
  
  getData();
});

// Sales over time - temporarily remove middleware
router.get('/sales-over-time', (req: Request, res: Response) => {
  const getData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        select: {
          createdAt: true,
          total: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      res.json(orders);
    } catch (error) {
      console.error("Sales over time error:", error);
      res.status(500).json({ error: "Error fetching sales data" });
    }
  };
  
  getData();
});

// Top products - temporarily remove middleware
router.get('/top-products', (req: Request, res: Response) => {
  const getData = async () => {
    try {
      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      });
      
      const products = await Promise.all(
        topProducts.map(async item => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true, price: true }
          });
          
          return {
            id: product?.id,
            name: product?.name || 'Unknown Product',
            totalQuantity: item._sum.quantity || 0
          };
        })
      );
      
      res.json(products);
    } catch (error) {
      console.error("Top products error:", error);
      res.status(500).json({ error: "Error fetching top products" });
    }
  };
  
  getData();
});

// Revenue summary - temporarily remove middleware
router.get('/revenue-summary', (req: Request, res: Response) => {
  const getData = async () => {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const dailyRevenue = await prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfToday }
        },
        _sum: { total: true }
      });
      
      const weeklyRevenue = await prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfWeek }
        },
        _sum: { total: true }
      });
      
      res.json({
        daily: dailyRevenue._sum.total || 0,
        weekly: weeklyRevenue._sum.total || 0
      });
    } catch (error) {
      console.error("Revenue summary error:", error);
      res.status(500).json({ error: "Error fetching revenue summary" });
    }
  };
  
  getData();
});

// Recent orders - temporarily remove middleware
router.get('/recent-orders', (req: Request, res: Response) => {
  const getData = async () => {
    try {
      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            include: {
              product: {
                select: { name: true }
              }
            }
          }
        }
      });
      
      res.json(recentOrders);
    } catch (error) {
      console.error("Recent orders error:", error);
      res.status(500).json({ error: "Error fetching recent orders" });
    }
  };
  
  getData();
});

// Customer analytics - temporarily remove middleware
router.get('/customer-analytics', (req: Request, res: Response) => {
  const getData = async () => {
    try {
      const totalUsers = await prisma.user.count();
      const usersWithOrders = await prisma.user.count({
        where: {
          orders: {
            some: {}
          }
        }
      });
      
      res.json({
        totalUsers,
        usersWithOrders,
        conversionRate: totalUsers > 0 ? (usersWithOrders / totalUsers * 100).toFixed(2) + '%' : '0%'
      });
    } catch (error) {
      console.error("Customer analytics error:", error);
      res.status(500).json({ error: "Error fetching customer analytics" });
    }
  };
  
  getData();
});

// Add a public revenue endpoint for display on the homepage
router.get('/public/stats', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Simple stats that can be shown publicly
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    const totalCustomers = await prisma.user.count();
    
    res.status(200).json({
      success: true,
      data: {
        products: totalProducts,
        orders: totalOrders,
        customers: totalCustomers
      }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public stats'
    });
  }
}));

export default router;