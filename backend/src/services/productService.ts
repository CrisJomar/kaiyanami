import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createProduct = async (
  name: string, description: string, price: number, stock: number, category: string
) => {
  return prisma.product.create({
    data: {
      name,
      description,
      price,
      stock,
      // Fix category relationship - use connect instead of direct assignment
      category: {
        connect: { id: category } // Assuming 'category' is the category ID
      }
    }
  });
};

export const updateProduct = async (id: string, data: Partial<{
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
}>) => {
  // Extract category to handle it separately
  const { category, ...otherData } = data;
  
  return prisma.product.update({
    where: { id },
    data: {
      ...otherData,
      // Only update category if it's provided
      ...(category && {
        category: {
          connect: { id: category }
        }
      })
    }
  });
};
