import express from "express";
import { PrismaClient } from '@prisma/client';
import { optionalAuth } from "../utils/middlewareHelpers";

const prisma = new PrismaClient();
const router = express.Router();


router.post('/', optionalAuth, async (req, res) => {
  try {
    const { customer, shipping, payment, items } = req.body;
    const user = req.user;
    
 
    const order = await prisma.order.create({
      data: {
        subtotal: 100,
        tax: 0.115,
        shipping: 5,
        total: 113.25,
        status: "pending",
        paymentStatus: "awaiting",
        guestEmail: customer?.email || "guest@example.com"
      }
    });
    
    res.status(201).json({ 
      success: true, 
      orderId: order.id 
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;