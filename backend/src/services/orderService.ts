import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // ✅ Initialize PrismaClient

export class OrderService {
  static async createOrder(userId: string, cartItems: any[], total: number, stripeSessionId: string) {
    return prisma.order.create({
      data: {
        userId,
        total,
        subtotal: total * 0.93, 
        tax: total * 0.115,      
        shipping: 10,          
        status: "pending",
        paymentStatus: "awaiting",
        // Store the session ID at the order level
        stripeClientSecret: stripeSessionId, 
        
        payment: {
          create: {
            paymentMethod: "stripe",
            stripePaymentMethodId: null,

            paymentIntentId: stripeSessionId, 
            amount: total,
            status: "pending",
            currency: "USD"
          }
        },
        
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null
          })),
        },
      },
      include: {
        orderItems: true,
        payment: true
      }
    });
  }

  static async getUserOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: { orderItems: { include: { product: true } } },
    });
  }

  static async updateOrderStatus(orderId: string, status: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }
}
