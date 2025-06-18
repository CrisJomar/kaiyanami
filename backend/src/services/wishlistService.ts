import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const addToWishlist = async (userId: string, productId: string) => {
  return prisma.wishlist.create({
    data: {
      user: { connect: { id: userId } },
      product: { connect: { id: productId } }
    }
  });
};

export const getWishlistForUser = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      wishlist: {
        include: {
          product: true
        }
      }
    }
  });
};

export const removeFromWishlist = async (id: string) => {
  return prisma.wishlist.delete({
    where: { id }
  });
};

export const clearWishlist = async (userId: string) => {
  return prisma.wishlist.deleteMany({
    where: { userId }
  });
};
