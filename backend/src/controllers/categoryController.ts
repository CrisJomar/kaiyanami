import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categoryController = {
  getAllCategories: async (req: Request, res: Response) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' }
      });
      return res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch categories',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      });
    }
  },
  
  getCategoryById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await prisma.category.findUnique({
        where: { id }
      });
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      return res.json(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      return res.status(500).json({ error: 'Failed to fetch category' });
    }
  },
  
  createCategory: async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }
      
      const newCategory = await prisma.category.create({
        data: { 
          name,
          description: description || ''
        }
      });
      
      return res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({ error: 'Failed to create category' });
    }
  },
  
  updateCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: { 
          name,
          description 
        }
      });
      
      return res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({ error: 'Failed to update category' });
    }
  },
  
  deleteCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // First check if this category has products
      const productsCount = await prisma.product.count({
        where: { categoryId: id }
      });
      
      if (productsCount > 0) {
        return res.status(409).json({ 
          error: 'Cannot delete category with associated products',
          productsCount
        });
      }
      
      await prisma.category.delete({
        where: { id }
      });
      
      return res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({ error: 'Failed to delete category' });
    }
  }
};

export default categoryController;