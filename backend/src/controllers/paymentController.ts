import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import * as emailService from '../utils/emailService';

dotenv.config();

const prisma = new PrismaClient();
// Using default Stripe API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface OrderItem {
  productId?: string;
  id?: string;
  quantity: number;
  price: number | string;
  size?: string | null;
  name?: string;
}

interface ShippingAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  firstName?: string;
  lastName?: string;
}

interface Customer {
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface OrderTotal {
  total?: string | number;
  subtotal?: string | number;
  tax?: string | number;
  shipping?: string | number;
}

const paymentController = {
  createPaymentIntent: async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      
      // Validate items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid items in request' });
      }
      
      // Calculate amount in cents
      const amount = Math.round(items.reduce((total, item) => {
        const price = parseFloat(item.price);
        const quantity = parseInt(item.quantity);
        
        if (isNaN(price) || isNaN(quantity)) {
          throw new Error(`Invalid price or quantity for item: ${JSON.stringify(item)}`);
        }
        
        return total + (price * quantity);
      }, 0) * 100);
      
      // Validate calculated amount
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ 
          error: 'Invalid order amount',
          calculatedAmount: amount,
          items: items
        });
      }
      
      console.log('Creating payment intent for amount:', amount);
      
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        }
      });
      
      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ 
        error: 'Failed to create payment intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Create order after payment
  createOrder: async (req: Request, res: Response): Promise<Response | void> => {
    console.time('orderCreation'); // Start timing
    console.log("1. Starting order creation");
    console.log("Request body:", JSON.stringify(req.body, null, 2)); // Log full request
    
    try {
      // Extract all required fields from request body once
      console.log("2. Extracting request data");
      const { 
        items = [],
        cartItems = [],  
        paymentMethodId = '',
        paymentIntentId = '',
        customer = {},   
        
        guestEmail = customer?.email || '',
        guestFirstName = customer?.firstName || '',
        guestLastName = customer?.lastName || '',
        
        shippingAddress = {},
        orderTotal = {}
      } = req.body;
      
      const orderItems = items.length > 0 ? items : cartItems;
      
      console.log("Email from request:", guestEmail || customer?.email || "No email provided");
      console.log("Items count:", orderItems.length);
      console.log("3. Checking items", orderItems.length);
      
      console.log("4. Attempting database operation");
      try {
        console.log("5. Creating basic order");
        
      
        const simpleOrder = await prisma.order.create({
          data: {
            userId: null,
            guestEmail: guestEmail || customer?.email || '',
            guestFirstName: guestFirstName || customer?.firstName || '',
            guestLastName: guestLastName || customer?.lastName || '',
            status: "pending",
            total: parseFloat(orderTotal?.total || '0'),
            subtotal: parseFloat(orderTotal?.subtotal || '0'),
            tax: parseFloat(orderTotal?.tax || '0'), 
            shipping: parseFloat(orderTotal?.shipping || '0'),
            guestShippingStreet: shippingAddress?.street || '',
            guestShippingCity: shippingAddress?.city || '',
            guestShippingState: shippingAddress?.state || '',
            guestShippingZipCode: shippingAddress?.zipCode || '',
            guestShippingCountry: shippingAddress?.country || 'US',
          }
        });
        
        console.log("6. Created simple order:", simpleOrder.id);
        
        console.log("7. Adding order items");
        
        const productIds = orderItems.map((item: OrderItem) => item.productId || item.id);
        console.log("Product IDs to check:", productIds);

        const existingProducts = await prisma.product.findMany({
          where: {
            id: {
              in: productIds
            }
          },
          select: { id: true }
        });

        console.log(`Found ${existingProducts.length} of ${productIds.length} products in database`);
        const existingProductIds = existingProducts.map((p: { id: string }) => p.id);
        const missingProductIds = productIds.filter((id: string) => !existingProductIds.includes(id));
        console.log("Missing product IDs:", missingProductIds);

        for (const item of orderItems as OrderItem[]) {
          const productId = item.productId || item.id;
          
          if (!productId) {
            console.warn(`Skipping product with undefined ID`);
            continue;
          }
          
          if (!existingProductIds.includes(productId)) {
            console.warn(`Skipping non-existent product: ${productId}`);
            continue;
          }
          
          console.log(`8. Adding item ${productId}`);
          await prisma.orderItem.create({
            data: {
              orderId: simpleOrder.id,
              productId: productId as string, 
              quantity: item.quantity,
              price: parseFloat(String(item.price || 0)),
              size: item.size || null
            }
          });
          console.log(`9. Added item ${productId}`);
        }
        
        console.log("10. All items added successfully");
        
        console.timeEnd('orderCreation');
        
        const recipientEmail = guestEmail || customer?.email || simpleOrder.guestEmail;
        console.log("Preparing to send email with recipient:", recipientEmail);

        if (!recipientEmail || recipientEmail.trim() === '') {
          console.warn("No email address provided - skipping confirmation email");
        } else {
          try {
            emailService.sendOrderConfirmation({
              orderId: simpleOrder.id,
              email: recipientEmail.trim(),
              items: orderItems || [],
              subtotal: parseFloat(String(simpleOrder.subtotal)) || 0,
              tax: parseFloat(String(simpleOrder.tax)) || 0,
              shipping: parseFloat(String(simpleOrder.shipping)) || 0,
              total: parseFloat(String(simpleOrder.total)) || 0,
              shippingAddress: {
                fullName: `${simpleOrder.guestFirstName || ''} ${simpleOrder.guestLastName || ''}`.trim(),
                street: shippingAddress?.street || '',
                address1: shippingAddress?.street || '',
                city: shippingAddress?.city || '',
                state: shippingAddress?.state || '',
                zipCode: shippingAddress?.zipCode || '',
                postalCode: shippingAddress?.zipCode || '',
                country: shippingAddress?.country || 'US'
              }
            }).catch((err: Error) => console.error('Email sending failed, but order was created:', err));
            
            console.log("Email sending initiated to", recipientEmail);
          } catch (emailErr) {
            console.error('Email service error:', emailErr);
          }
        }
        
        return res.status(200).json({
          success: true,
          orderId: simpleOrder.id
        });
      } catch (error: any) {
        console.error("Error in database operations:", error);
        return res.status(500).json({
          error: 'Database operation failed',
          details: error.message || String(error)
        });
      }
    } catch (error: any) {
      console.error("Error in createOrder:", error);
      console.timeEnd('orderCreation'); // End timing on error too
      return res.status(500).json({ error: "Error processing order" });
    }
  },
  
  handleWebhook: async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        endpointSecret || ''
      );
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('PaymentIntent was successful:', paymentIntent.id);
        
        // Update order if it exists
        try {
          const order = await prisma.order.findFirst({
            where: { stripePaymentIntentId: paymentIntent.id }
          });
          
          if (order) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'paid',
                status: 'processing'
              }
            });
            
            // Update the payment record if it exists
            if (order.paymentIntentId) {
              await prisma.payment.updateMany({
                where: { 
                  OR: [
                    { orderId: order.id },
                    { paymentIntentId: order.paymentIntentId }
                  ]
                },
                data: { status: 'completed' }
              });
            }
            
            console.log('Order updated to paid:', order.id);
          }
        } catch (err) {
          console.error('Error updating order status:', err);
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', failedPayment.id);
        
        // Update order if it exists
        try {
          const order = await prisma.order.findFirst({
            where: { stripePaymentIntentId: failedPayment.id }
          });
          
          if (order) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'failed',
                status: 'cancelled'
              }
            });
            
            // Update the payment record if it exists
            if (order.paymentIntentId) {
              await prisma.payment.updateMany({
                where: { 
                  OR: [
                    { orderId: order.id },
                    { paymentIntentId: order.paymentIntentId }
                  ]
                },
                data: { status: 'failed' }
              });
            }
            
            console.log('Order marked as failed payment:', order.id);
          }
        } catch (err) {
          console.error('Error updating failed payment status:', err);
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  },
  
  getOrder: async (req: Request, res: Response) => {
    // Access user safely with optional chaining
    const user = (req as any).user;

    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }
      
      console.log("Looking up order:", orderId);
      console.log("User from request:", user?.id || "No authenticated user");
      
      // Get the order with its items and address
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          shippingAddress: true
        }
      });
      
      if (!order) {
        console.log("Order not found:", orderId);
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.userId && user && order.userId !== user.id) {
        console.log("Unauthorized access attempt:", user.id, "trying to access order for", order.userId);
        return res.status(403).json({ error: 'Unauthorized access to this order' });
      }
      
      console.log("Order access granted");
      
      res.json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ 
        error: 'Failed to fetch order details',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  sendConfirmationEmail: async (req: Request, res: Response) => {
    try {
      const { orderId, email, items } = req.body;
      
      console.log("Sending confirmation email for order:", orderId, "to:", email);
      console.log("Items provided:", items);
      
      if (!email) {
        return res.status(400).json({ message: 'Email address is required' });
      }
      
      // Set up the email transporter with your existing credentials
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      console.log("Email credentials:", process.env.EMAIL_USER);
      
      // Create a simple array for the order items
      const orderItems = items && Array.isArray(items) ? items.map(item => ({
        name: item.name || 'Product',
        quantity: parseInt(String(item.quantity)) || 1,
        price: parseFloat(String(item.price)) || 0,
        total: (parseFloat(String(item.price)) || 0) * (parseInt(String(item.quantity)) || 1),
        size: item.selectedSize || item.size || ''
      })) : [];
      
      // Calculate totals
      const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
      const shipping = subtotal >= 100 ? 0 : 10;
      const tax = subtotal * 0.115;
      const total = subtotal + shipping + tax;
      
      // Create HTML email template with simple styling
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f4f4f4; text-align: left; padding: 10px; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .totals td { border: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Thank you for your order! We're processing it now and will ship it soon.</p>
              
              <h2>Order Details</h2>
              <p><strong>Order Number:</strong> ${orderId || 'N/A'}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              
              <table>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
                ${orderItems.length > 0 ? orderItems.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td>$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="4" style="text-align: center;">No items in order</td>
                  </tr>
                `}
                <tr class="totals">
                  <td colspan="3" align="right"><strong>Subtotal:</strong></td>
                  <td>$${subtotal.toFixed(2)}</td>
                </tr>
                <tr class="totals">
                  <td colspan="3" align="right"><strong>Shipping:</strong></td>
                  <td>${shipping === 0 ? 'Free' : '$' + shipping.toFixed(2)}</td>
                </tr>
                <tr class="totals">
                  <td colspan="3" align="right"><strong>Tax:</strong></td>
                  <td>$${tax.toFixed(2)}</td>
                </tr>
                <tr class="totals">
                  <td colspan="3" align="right"><strong>Total:</strong></td>
                  <td><strong>$${total.toFixed(2)}</strong></td>
                </tr>
              </table>
              
              <p>If you have any questions about your order, please contact our customer service.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Kaiyanami. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      console.log("Attempting to send email...");
      
      // Send the email
      const info = await transporter.sendMail({
        from: `"Kaiyanami Shop" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Order Confirmation #${orderId || 'New Order'}`,
        html: htmlContent
      });
      
      console.log('Email sent successfully:', info.messageId);
      
      res.status(200).json({
        message: 'Order confirmation email sent successfully',
        emailId: info.messageId
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      res.status(500).json({
        message: 'Failed to send confirmation email',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    console.log("Order creation started with body:", JSON.stringify(req.body, null, 2));
    
    // Extract data with defaults to prevent undefined errors
    const { 
      cartItems = [], 
      shippingAddress = {}, 
      paymentIntent = {},
      customer = {}
    } = req.body;
    
    // Basic validation
    if (!cartItems.length) {
      console.log("No cart items provided");
      return res.status(400).json({ success: false, message: 'No items in cart' });
    }
    
    // Create order with robust error handling
    const newOrder = await prisma.order.create({
      data: {
        // Order data with null coalescing to prevent errors
        userId: req.user?.id || null,
        status: 'confirmed',
        paymentStatus: 'paid',
        total: parseFloat(paymentIntent.amount || 0) / 100,
        subtotal: parseFloat(paymentIntent.amount_subtotal || 0) / 100,
        tax: 0, 
        shipping: 0, 
     
        guestEmail: customer.email || '',
        guestFirstName: shippingAddress.firstName || '',
        guestLastName: shippingAddress.lastName || '',
        // Shipping address with fallbacks
        guestShippingStreet: shippingAddress.street || '',
        guestShippingCity: shippingAddress.city || '',
        guestShippingState: shippingAddress.state || '',
        guestShippingZipCode: shippingAddress.zipCode || '',
        guestShippingCountry: shippingAddress.country || '',
        // Create order items
        orderItems: {
          create: cartItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: parseFloat(item.price || 0),
            size: item.size || null
          }))
        }
      },
      // Include related data in the response
      include: {
        orderItems: true
      }
    });
    
    console.log("Order created successfully:", newOrder);
    
  
    try {
      // Send confirmation email
      await emailService.sendOrderConfirmation({
        orderId: newOrder.id,
        email: customer.email || newOrder.guestEmail || '', 
        items: cartItems.map((item: any) => ({ 
          name: item.name || 'Product',
          price: parseFloat(String(item.price)) || 0,
          quantity: parseInt(String(item.quantity)) || 1,
          size: item.size || null
        })),
        subtotal: parseFloat(String(newOrder.subtotal)) || 0,
        tax: parseFloat(String(newOrder.tax)) || 0,
        shipping: parseFloat(String(newOrder.shipping)) || 0,
        total: parseFloat(String(newOrder.total)) || 0,
        shippingAddress: {
          fullName: `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
          address1: shippingAddress.street || '',
          street: shippingAddress.street || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          postalCode: shippingAddress.zipCode || '',
          zipCode: shippingAddress.zipCode || '',
          country: shippingAddress.country || 'US'
        }
      });
      console.log('Order confirmation email sent successfully');
    } catch (emailErr) {
      console.error('Email service error:', emailErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: newOrder
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: String(error),
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
};

export default paymentController;