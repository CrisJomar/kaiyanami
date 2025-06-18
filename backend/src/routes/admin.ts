import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client'; 
import adminController from '../controllers/adminController';
import authMiddleware from '../middleware/authMiddleware';
import CategoryController from '../controllers/categoryController';
import { sendShippingNotificationEmail } from '../utils/emailService'; 
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers'; // Add this
import { getAnalytics } from '../controllers/analyticsController'; 
const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check for admin role
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin only' });
  }
  next();
};

// Add checkAdmin middleware definition at the top of the file
const checkAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;
  
  // Check if user exists and has admin role
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    return; // Just return, don't return the response object
  }
  
  next();
};

// Helper function to handle async controllers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

const typedMiddleware = authMiddleware as any;

// Dashboard routes
router.get('/stats', typedMiddleware, adminOnly, (req, res) => {
  adminController.getDashboardStats(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

// User management routes
router.get('/users', typedMiddleware, adminOnly, (req, res) => {
  adminController.getAllUsers(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

router.get('/users/:id', typedMiddleware, adminOnly, (req, res) => {
  adminController.getUserById(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

router.post('/users', typedMiddleware, adminOnly, (req, res) => {
  adminController.createUser(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

router.put('/users/:id', typedMiddleware, adminOnly, (req, res) => {
  adminController.updateUser(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

router.delete('/users/:id', typedMiddleware, adminOnly, (req, res) => {
  adminController.deleteUser(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

// Order management routes
router.get('/orders', typedMiddleware, adminOnly, (req, res) => {
  adminController.getAllOrders(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

router.patch('/orders/:id/status', typedMiddleware, adminOnly, (req, res) => {
  adminController.updateOrderStatus(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});



/**
 * @route PATCH /api/admin/orders/:id/ship
 * @desc Update order status to shipped, add tracking number and send email notification
 * @access Private/Admin
 */
router.patch('/orders/:id/ship', typedMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { trackingNumber, sendEmail = true } = req.body;
    
    if (!trackingNumber) {
      return res.status(400).json({ message: 'Tracking number is required' });
    }
    
    // Update order with tracking information
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'shipped',
        trackingNumber,
        shippedAt: new Date()
      },
      include: {
        user: true,
        orderItems: {
          include: {
            product: true
          }
        },
        shippingAddress: true
      }
    });
    
    // Send email notification if requested and there's a user email
    if (sendEmail && updatedOrder.user?.email) {
      try {
        await sendShippingNotificationEmail(
          updatedOrder.user.email,
          {
            orderId: updatedOrder.id,
            customerName: updatedOrder.user.firstName || 'Customer',
            trackingNumber: trackingNumber,
            orderTotal: updatedOrder.total,
            orderDate: updatedOrder.createdAt,
            shippingAddress: updatedOrder.shippingAddress
          }
        );
        console.log(`Shipping notification email sent to ${updatedOrder.user.email}`);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Continue even if email fails
      }
    }
    
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order shipping info:', error);
    res.status(500).json({ message: 'Failed to update shipping information' });
  }
}));



/**
 * @route GET /api/admin/orders/:id
 * @desc Get single order details by ID
 * @access Private/Admin
 */
router.get('/orders/:id', typedMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching order details for ID: ${id}`);
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        orderItems: {
          include: {
            product: true
          }
        },
        shippingAddress: true
      }
    });
    
    if (!order) {
      console.log(`Order not found with ID: ${id}`);
      return res.status(404).json({ message: 'Order not found' });
    }
    
    console.log(`Order found, returning details`);
    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
}));



/**
 * @route GET /api/admin/orders-debug
 * @desc Debug endpoint to get all order IDs
 * @access Private/Admin
 */
router.get('/orders-debug', typedMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Debug: Found ${orders.length} orders`);
    orders.forEach(o => console.log(`Order ID: ${o.id}, Status: ${o.status}`));
    
    res.status(200).json(orders);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ message: 'Debug endpoint error', error: String(error) });
  }
}));


/**
 * @route GET /api/admin/analytics
 * @desc Get analytics data for admin dashboard
 * @access Private/Admin
 */
router.get('/analytics', typedMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  try {
    console.log("Generating analytics data...");
    
    // Get total revenue from orders
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
      }
    });
    
    // Calculate total revenue
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.total || 0), 
      0
    );
    
    // Generate monthly revenue data
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    
    const revenueByMonth = monthNames.map(month => ({
      month,
      revenue: 0
    }));
    
    orders.forEach(order => {
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        const monthIndex = orderDate.getMonth();
        revenueByMonth[monthIndex].revenue += order.total || 0;
      }
    });
    
    // Get order status counts
    const ordersByStatus = [
      { status: 'pending', count: 0 },
      { status: 'processing', count: 0 },
      { status: 'shipped', count: 0 },
      { status: 'delivered', count: 0 },
      { status: 'cancelled', count: 0 }
    ];
    
    orders.forEach(order => {
      const statusGroup = ordersByStatus.find(group => group.status === order.status);
      if (statusGroup) {
        statusGroup.count++;
      }
    });
    
    // Get top 5 products sold
    const topProducts = await prisma.orderItem.findMany({
      take: 5,
      include: {
        product: true
      },
      orderBy: {
        quantity: 'desc'
      }
    });
    
    const formattedTopProducts = topProducts.map(item => ({
      id: item.productId,
      name: item.product?.name || 'Unknown Product',
      quantity: item.quantity,
      price: item.product?.price || 0
    }));
    
    res.json({
      totalRevenue,
      revenueByMonth,
      ordersByStatus,
      topProducts: formattedTopProducts,
      // Include some sample data until your real data builds up
      recentOrders: orders.slice(0, 5).map(order => ({
        id: order.id,
        amount: order.total,
        status: order.status,
        date: order.createdAt
      })),
    });
  } catch (error) {
    console.error("Error generating analytics:", error);
    res.status(500).json({ message: 'Failed to generate analytics data' });
  }
}));

// Product management routes
router.get('/products', typedMiddleware, adminOnly, (req, res) => {
  adminController.getAllProducts(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

router.post('/products', typedMiddleware, adminOnly, (req, res) => {
  adminController.createProduct(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

router.put('/products/:id', typedMiddleware, adminOnly, (req, res) => {
  adminController.updateProduct(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

router.delete('/products/:id', typedMiddleware, adminOnly, (req, res) => {
  adminController.deleteProduct(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });
});

// Category routes
router.get('/categories', checkAdmin, (req: Request, res: Response): void => {
  // Change from CategoryController.getAll to CategoryController.getAllCategories
  CategoryController.getAllCategories(req, res).catch((err: Error) => {
    console.error('Error in GET /admin/categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  });
});

router.post('/categories', checkAdmin, (req: Request, res: Response): void => {
  // Change from CategoryController.create to CategoryController.createCategory
  CategoryController.createCategory(req, res).catch((err: Error) => {
    console.error('Error in POST /admin/categories:', err);
    res.status(500).json({ error: 'Failed to create category' });
  });
});

router.put('/categories/:id', checkAdmin, (req: Request, res: Response): void => {
  // Change from CategoryController.update to CategoryController.updateCategory
  CategoryController.updateCategory(req, res).catch((err: Error) => {
    console.error('Error in PUT /admin/categories/:id:', err);
    res.status(500).json({ error: 'Failed to update category' });
  });
});

router.delete('/categories/:id', checkAdmin, (req: Request, res: Response): void => {
  // Change from CategoryController.delete to CategoryController.deleteCategory
  CategoryController.deleteCategory(req, res).catch((err: Error) => {
    console.error('Error in DELETE /admin/categories/:id:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  });
});

// Add this new route to handle protected route
router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});

export default router;