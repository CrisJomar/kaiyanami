import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ProductService {
  static async create(data: { name: string; description: string; price: number; stock: number; category: string }) {
    return prisma.product.create({ data });
  }

  static async getAll() {
    return prisma.product.findMany();
  }

  static async getById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  }

  static async update(id: string, data: Partial<{ name: string; description: string; price: number; stock: number; category: string }>) {
    return prisma.product.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.product.delete({ where: { id } });
  }
}
