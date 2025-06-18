import express, { Request, Response, RequestHandler } from "express";
import { PrismaClient, Prisma } from '@prisma/client';
import { verifyToken, optionalAuth } from "../utils/middlewareHelpers";
import { sendOrderConfirmation } from '../utils/emailService'; // Adjust import path as needed

const prisma = new PrismaClient();
const router = express.Router();

// Define custom request interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

// Define order creation types for better type safety
interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  size?: string | null;
}

interface ShippingInfo {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  method: string;
}

interface CustomerInfo {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface OrderCreationBody {
  customer?: CustomerInfo;
  shipping: ShippingInfo;
  payment: any; // You can define a more specific type if needed
  items: OrderItem[];
}

// PUBLIC ORDER ENDPOINTS
router.get('/public/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId;
    
    if (!orderId || orderId === ':orderId') {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true, 
                name: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });
    
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    
    res.json({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// USER ORDER ENDPOINTS
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    const orders = await prisma.order.findMany({
      where: { userId: user?.id },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: { product: true }
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

router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        orderItems: {
          include: { product: true }
        },
        shippingAddress: true,
        payment: true
      }
    });
    
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    
    if (order.userId && order.userId !== user?.id) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }
    
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ORDER CREATION ENDPOINT 
router.post('/create-order', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { customer, shipping, payment, items } = req.body as OrderCreationBody;
    
    console.log("CREATE ORDER REQUEST:", { 
      user: user ? { id: user.id, email: user.email } : "guest",
      customer,
      shipping,
      items: items?.length,
      hasPayment: !!payment
    });
    
    if (!shipping || !items || !payment) {
      console.log("❌ Missing required fields:", { 
        hasShipping: !!shipping, 
        hasItems: !!items, 
        hasPayment: !!payment 
      });
      res.status(400).json({ 
        success: false, 
        message: "Missing required information" 
      });
      return;
    }
    
    // Calculate totals
    const subtotal = items.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
    const tax = parseFloat((subtotal * 0.115).toFixed(2));
    const shippingCost = shipping.method === 'express' ? 15.00 : 5.00;
    const total = parseFloat((subtotal + tax + shippingCost).toFixed(2));
    
    // Create order object 
    const orderData: Prisma.OrderCreateInput = {
      subtotal,
      tax,
      shipping: shippingCost,
      total,
      status: "pending",
      paymentStatus: "awaiting",
      ...(user ? { user: { connect: { id: user.id } } } : {}),
    };
    
    if (user) {
      // For authenticated users, fetch their actual name from database
      const userDetails = await prisma.user.findUnique({
        where: { id: user.id },
        select: { firstName: true, lastName: true, email: true }
      });
      
      console.log(" user name:", userDetails?.firstName, userDetails?.lastName);
      
      // Create shipping address
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
      
      orderData.shippingAddress = { connect: { id: shippingAddress.id } };
      
      // Use user details for order confirmation
  
      orderData.guestFirstName = userDetails?.firstName || customer?.firstName || '';
      orderData.guestLastName = userDetails?.lastName || customer?.lastName || '';
      orderData.guestEmail = userDetails?.email || customer?.email || '';
    } else {
      orderData.guestEmail = customer?.email || '';
      orderData.guestFirstName = customer?.firstName || '';
      orderData.guestLastName = customer?.lastName || '';
      orderData.guestShippingStreet = shipping.address;
      orderData.guestShippingCity = shipping.city;
      orderData.guestShippingState = shipping.state;
      orderData.guestShippingZipCode = shipping.zipCode;
      orderData.guestShippingCountry = shipping.country || "US";
    }
    
    // Create the order
    const order = await prisma.order.create({
      data: {
        ...orderData,
        orderItems: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null  // Added null fallback
          }))
        },
        payment: {
          create: {
            
            paymentMethod: "stripe",  
            stripePaymentMethodId: payment.paymentMethodId, 
            amount: total,
            status: "pending",
            currency: "USD"
          }
        }
      },
      include: {
        orderItems: {
          include: { product: true }
        },
        shippingAddress: true,
        payment: true
      }
    });


    try {
      await sendOrderConfirmation({
        email: user ? user.email : (customer?.email || ''),
        firstName: orderData.guestFirstName || 'Valued Customer',
        lastName: orderData.guestLastName || '',
        orderId: order.id,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        items: order.orderItems.map(item => ({
          productName: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.price,
          size: item.size
        }))
      });
      console.log("✉️ Order confirmation email sent to:", user ? user.email : customer?.email);
    } catch (emailError) {
      // Don't fail the order if email fails, just log it
      console.error("⚠️ Failed to send order confirmation email:", emailError);
    }
    
    res.status(201).json({ 
      success: true,
      orderId: order.id,
      order  
    });
  } catch (error) {
    console.error("🔴 Error creating order:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
});

// ADMIN ROUTES
router.patch('/:id/status', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { status } = req.body;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    
    await prisma.order.update({
      where: { id: req.params.id },
      data: { status }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch('/:id/payment', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentStatus } = req.body;
    
    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { paymentStatus }
    });
    
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;