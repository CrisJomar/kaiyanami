import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { verifyToken, optionalAuth } from "./authMiddleware";

// Define custom request type with user property
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;  // Allow additional properties from actual user object
  };
  isWebhook?: boolean;
}

export const router = express.Router();

// Get all orders for the authenticated user
router.get("/", verifyToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  try {
    const orders = await prisma.order.findMany({
      where: { userId: user?.id },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        shippingAddress: true,
        payment: true
      }
    });
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific order by ID
router.get("/:id", verifyToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        shippingAddress: true,
        payment: true
      }
    });
    
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    
    // Check if the order belongs to the logged-in user
    if (order.userId && order.userId !== user?.id) {
      res.status(403).json({ message: "Not authorized to access this order" });
      return;
    }
    
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", optionalAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  try {
    const { customer, shipping, items, payment } = req.body;
    
    // Calculate order totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const tax = parseFloat((subtotal * 0.115).toFixed(2)); // 
    const shippingCost = shipping.method === 'express' ? 15.00 : 5.00; 
    const total = parseFloat((subtotal + tax + shippingCost).toFixed(2));
    
    // Start a transaction for creating order and related records
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Create the order with correct fields
      let createOrderData: any = {
        subtotal,
        tax,
        shipping: shippingCost,
        total,
        status: "pending",
        paymentStatus: "awaiting",
      };
      
      // Handle authenticated vs guest user
      if (user?.id) {
        // For authenticated users, connect to user
        createOrderData.user = { connect: { id: user.id } };
      } else {
        // For guests, store guest info
        createOrderData.guestEmail = customer.email;
        createOrderData.guestFirstName = customer.firstName;
        createOrderData.guestLastName = customer.lastName;
        createOrderData.guestPhone = customer.phone || null;
      }
      
      const newOrder = await prisma.order.create({ data: createOrderData });
      
      // 2. Handle shipping address
      if (user?.id) {
        // For authenticated users, create an address
        const shippingAddress = await prisma.address.create({
          data: {
            userId: user.id,
            street: shipping.address,
            city: shipping.city,
            state: shipping.state,
            zipCode: shipping.zipCode,
            country: shipping.country || "US",
            isDefault: false
          }
        });
        
        // Update order with shipping address
        await prisma.order.update({
          where: { id: newOrder.id },
          data: { shippingAddressId: shippingAddress.id }
        });
      } else {
        // For guests, create a guest shipping address
        await prisma.guestShippingAddress.create({
          data: {
            orderId: newOrder.id,
            fullName: `${customer.firstName} ${customer.lastName}`,
            street: shipping.address,
            city: shipping.city,
            state: shipping.state,
            zipCode: shipping.zipCode,
            country: shipping.country || "US"
          }
        });
      }
      
      // 3. Create order items
      for (const item of items) {
        await prisma.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null
          }
        });
        
        // Update product stock (optional)
        if (process.env.REDUCE_STOCK_ON_ORDER === 'true') {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
        }
      }
      
      // 4. Create payment record
      await prisma.payment.create({
        data: {
          orderId: newOrder.id,
          amount: total,
          currency: "USD",
          status: "pending",
          paymentMethod: payment.method || "stripe"
        }
      });
      
      return newOrder;
    });
    
    // Return success response
    res.status(201).json({
      success: true,
      orderId: result.id,
      message: "Order created successfully",
      total: result.total
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ 
      message: "Failed to create order", 
      error: String(error) 
    });
  }
});

// Update order status (admin only)
router.patch("/:id/status", verifyToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  try {
    const { status } = req.body;
    
    // Check if user is admin
    if (user?.role !== 'admin') {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    
    if (!status || !["pending", "processing", "shipped", "delivered", "cancelled"].includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }
    
    const order = await prisma.order.findUnique({
      where: { id: req.params.id }
    });
    
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    
    // Update status
    await prisma.order.update({
      where: { id: req.params.id },
      data: { status }
    });
    
    // Send email notification (pseudocode)
    // if (order.userId) {
    //   sendOrderStatusEmail(order.id, status);
    // } else if (order.guestEmail) {
    //   sendGuestOrderStatusEmail(order.guestEmail, order.id, status);
    // }
    
    res.json({ success: true, message: "Order status updated" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update payment status (webhook or admin)
router.patch("/:id/payment", verifyToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const isWebhook = (req as any).isWebhook;
  
  try {
    const { paymentStatus, paymentIntentId } = req.body;
    
    // Check if user is admin
    if (user?.role !== 'admin' && !isWebhook) {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    
    if (!paymentStatus || !["awaiting", "processing", "paid", "failed"].includes(paymentStatus)) {
      res.status(400).json({ message: "Invalid payment status" });
      return;
    }
    
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { payment: true }
    });
    
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    
    // Update order payment status
    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { 
        paymentStatus,
        ...(paymentIntentId && { stripePaymentIntentId: paymentIntentId })
      }
    });
    
    // Update payment record if exists
    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { 
          status: paymentStatus,
          ...(paymentIntentId && { paymentIntentId })
        }
      });
    }
    
    res.json({ success: true, message: "Payment status updated", order: updatedOrder });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;