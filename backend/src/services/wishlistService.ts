import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class WishlistService {
  static async getWishlist(userId: string) {
    return prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true },
    });
  }

  static async addToWishlist(userId: string, productId: string) {
    // 🛠️ Check if product exists
    const productExists = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!productExists) {
      throw new Error("Product does not exist");
    }

    // Check if item is already in wishlist
    const existingItem = await prisma.wishlistItem.findFirst({
      where: { userId, productId },
    });

    if (existingItem) {
      throw new Error("Product is already in wishlist");
    }

    return prisma.wishlistItem.create({
      data: { userId, productId },
    });
  }

  static async removeFromWishlist(userId: string, productId: string) {
    return prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  }
}
