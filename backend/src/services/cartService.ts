import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class CartService {
  static async getCart(userId: string) {
    return prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });
  }

  static async addToCart(userId: string, productId: string, quantity: number) {
    // First, get or create a cart for the user
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    const existingCartItem = await prisma.cartItem.findFirst({
      where: { userId, productId },
    });

    if (existingCartItem) {
      return prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + quantity },
      });
    } else {
      return prisma.cartItem.create({
        data: { userId, productId, quantity, cartId: cart.id },
      });
    }
  }

  static async removeFromCart(userId: string, productId: string) {
    return prisma.cartItem.deleteMany({
      where: { userId, productId },
    });
  }

  static async clearCart(userId: string) {
    return prisma.cartItem.deleteMany({
      where: { userId },
    });
  }
}
