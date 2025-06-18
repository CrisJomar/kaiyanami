import express, { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { sendOrderConfirmation } from "../utils/emailService"; 
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers'; // ✅ Import middleware helpers

dotenv.config();
const router = express.Router();
const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-02-24.acacia",
});

// ✅ Define the correct webhook handler function
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const sig = req.headers["stripe-signature"];

    let event;
    if (!sig) {
      console.warn("⚠️ Skipping signature verification for manual testing.");
      event = { type: "checkout.session.completed", data: { object: req.body } };
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;
      const totalAmount = session.amount_total ? session.amount_total / 100 : 0; // ✅ Ensure a valid amount

      console.log(`✅ Payment Successful! Amount: $${totalAmount}`);

      if (!customerEmail) {
        console.error("❌ Missing customer email.");
        res.status(400).json({ error: "Missing customer email" });
        return;
      }

      // ✅ Find User by Email
      let user = await prisma.user.findUnique({ where: { email: customerEmail } });

      if (!user) {
        console.warn(`⚠️ User not found for email ${customerEmail}, creating a new user.`);
        user = await prisma.user.create({
          data: {
            email: customerEmail,
            firstName: "Stripe",
            lastName: "Customer", // Default name
            password: "", // Leave blank if using OAuth
          },
        });
      }

      // ✅ Store order in the database with all required fields
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          total: totalAmount,
          status: "PAID",
          shippingAddressId: null,
          stripePaymentIntentId: session.payment_intent?.toString(), // Add payment intent ID from Stripe
          subtotal: totalAmount, 
          tax: 0.115 * totalAmount, 
          shipping: 0, 
          paymentStatus: "completed", 
          
          orderItems: {
            create: session.metadata && session.metadata.items 
              ? JSON.parse(session.metadata.items).map((item: any) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                  size: item.size || null
                }))
              : []
          }
        },
      });

      console.log("✅ Order Saved with ID:", order.id);

      
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          status: "completed",
          paymentMethod: "stripe",
          paymentIntentId: session.payment_intent?.toString(),
          cardBrand: session.payment_method_types?.[0] || "card",
        }
      });

      console.log("✅ Payment record created!");

      // ✅ Send email confirmation
      await sendOrderConfirmation({
        email: customerEmail,
        orderId: session.id,
        total: totalAmount,
        subtotal: totalAmount,
        tax: 0.115 * totalAmount,
        shipping: 10,
        items: [],
        shippingAddress: {
          fullName: `${user.firstName} ${user.lastName}`,
          street: '', 
          address1: '',
          city: '',
          state: '',
          zipCode: '', 
          postalCode: '',
          country: 'US'
        }
      });
      console.log("📧 Order confirmation email sent!");
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("❌ Webhook Error:", error.message);
    res.status(400).json({ error: `Webhook error: ${error.message}` });
  }
});

router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});

export default router;
