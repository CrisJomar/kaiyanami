// Updated backend/src/controllers/orderController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import emailService from '../utils/emailService';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'your_test_key_here');

// Add proper type definition for OrderItem
interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  size?: string | null;
}

// Add this function to check stock availability
interface OrderItemForStock {
  productId: string;
  quantity: number;
  size?: string | null;
}

interface ProductWithSizes {
  id: string;
  name: string;
  stock: number;
  hasSizes: boolean;
  productSizes: Array<{
    size: string;
    stock: number;
  }>;
}

async function checkStockAvailability(items: OrderItemForStock[]): Promise<boolean> {
  for (const item of items) {
    const { productId, quantity, size } = item;
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { productSizes: true }
    }) as ProductWithSizes | null;
    
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }
    
    // Check size-specific stock if applicable
    if (product.hasSizes && size) {
      const sizeItem = product.productSizes.find(s => s.size === size);
      if (!sizeItem || sizeItem.stock < quantity) {
        throw new Error(`Not enough stock for ${product.name} in size ${size}`);
      }
    } 
    // Also check the main product stock
    else if (product.stock < quantity) {
      throw new Error(`Not enough stock for ${product.name}`);
    }
  }
  
  return true;
}

// Add this function to check stock levels before creating orders
async function validateStockLevels(items: any[]): Promise<boolean> {
  for (const item of items) {
    const { productId, quantity, size } = item;
    
    // Get the product with its sizes
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { productSizes: true }
    });
    
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    // Check stock based on whether the product has sizes
    if (product.hasSizes && size) {
     
      const productSize = product.productSizes.find(s => s.size === size);
      
      if (!productSize) {
        throw new Error(`Size ${size} not found for product ${product.name}`);
      }
      
      if (productSize.stock < quantity) {
        throw new Error(`Not enough stock for ${product.name} in size ${size}. Available: ${productSize.stock}, Requested: ${quantity}`);
      }
    } else if (!product.hasSizes) {
      // Check main product stock
      if (product.stock < quantity) {
        throw new Error(`Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
      }
    }
  }
  
  return true;
}

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: true,
        shippingAddress: true,
      },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { 
      userId, items, shippingAddress, billingAddress,
      paymentMethod, subtotal, tax, shipping, total
    } = req.body;
    
    // Validate stock levels before creating the order
    try {
      await validateStockLevels(items);
    } catch (stockError: unknown) {
      const errorMessage = stockError instanceof Error ? stockError.message : 'Stock validation failed';
      return res.status(400).json({ error: errorMessage });
    }
    
    // Create the order with Prisma
    const order = await prisma.order.create({
      data: {
        userId: userId as string, // Cast to string
        status: 'pending',
        shippingAddress,
        billingAddress,
        subtotal,
        tax,
        shipping,
        total,
        orderItems: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null
          }))
        }
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });
    
    // Update inventory stock levels
    await updateStockLevels(order.orderItems);
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const user = (req as any).user;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    console.log("Looking up order:", orderId);
    console.log("User from request:", user?.id || "Guest access");
    
    // Get the order with its items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!order) {
      console.log("Order not found:", orderId);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Security check: For user orders, verify ownership
    if (order.userId && user && order.userId !== user.id) {
      console.log("Unauthorized access attempt:", user.id, "trying to access order for", order.userId);
      return res.status(403).json({ error: 'Unauthorized access to this order' });
    }
    
    // For guest orders, no additional checks needed since we don't have any user info
    
    console.log("Order access granted");
    
    // Create a simplified response for guest/public consumption
    const formattedOrder = {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      // Add guest fields
      guestEmail: order.guestEmail,
      guestFirstName: order.guestFirstName,
      guestLastName: order.guestLastName,
      // Add shipping address formatted for frontend
      shippingAddress: {
        fullName: `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim(),
        street: order.guestShippingStreet || '',
        city: order.guestShippingCity || '',
        state: order.guestShippingState || '',
        zipCode: order.guestShippingZipCode || '',
        country: order.guestShippingCountry || ''
      },
      // Format order items for display
      orderItems: order.orderItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || 'Product',
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        image: item.product?.imageUrl || ''
      }))
    };
    
    res.json(formattedOrder);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order details',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
async function updateStockLevels(orderItems: any[]) {
  for (const item of orderItems) {
    const { productId, quantity, size } = item;
    const product = item.product;
    
    // If product has sizes and a specific size was ordered
    if (product.hasSizes && size) {
      // Update the specific size's stock
      await prisma.productSize.updateMany({
        where: {
          productId,
          size
        },
        data: {
          stock: {
            decrement: quantity
          }
        }
      });
    
    } else {
     
      await prisma.product.update({
        where: {
          id: productId
        },
        data: {
          stock: {
            decrement: quantity
          }
        }
      });
    }
  }
  
  console.log('Stock levels updated successfully');
}

