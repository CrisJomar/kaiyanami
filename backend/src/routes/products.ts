import express from 'express';
import { Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';
import asyncHandler from 'express-async-handler';
import { Router } from 'express';
import * as productController from '../controllers/productController';

const router = express.Router();
const prisma = new PrismaClient();

// Get all categories with product counts
router.get('/categories', (async function(req: Request, res: Response) {
  try {
    const categoriesWithCount = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    const formattedCategories = categoriesWithCount.map(category => ({
      id: category.id,
      name: category.name,
      count: category._count.products,
      description: category.description || ''
    }));
    
    res.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
}) as RequestHandler);

// Get products by category name
router.get('/category/:categoryName', (async function(req: Request, res: Response) {
  try {
    const { categoryName } = req.params;
    
    const category = await prisma.category.findFirst({
      where: { name: categoryName }
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const products = await prisma.product.findMany({
      where: { 
        categoryId: category.id 
      },
      include: {
        productSizes: true,
        category: true
      }
    });
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Failed to fetch products by category' });
  }
}) as RequestHandler);

// Admin route for product management with filtering
router.get('/admin', auth, async function(req: Request, res: Response) {
  try {
    const { 
      page = '1', 
      limit = '10', 
      search, 
      category, 
      sortField = 'updatedAt', 
      sortDirection = 'desc' 
    } = req.query;
    
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    
    // Build the where clause for filtering
    const whereClause: any = {};
    
    // Add search functionality
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
  
    if (category && category !== 'all') {
      const categoryObj = await prisma.category.findFirst({
        where: { name: category as string }
      });
      
      if (categoryObj) {
        whereClause.categoryId = categoryObj.id;
      }
    }

   
    const orderBy: any = {};
    orderBy[sortField as string] = sortDirection;
    
    // Get products with filters, 
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        productSizes: true
      },
      orderBy,
      skip,
      take: pageSize
    });
    
    // Get total count of products matching the filters
    const total = await prisma.product.count({ where: whereClause });
    
    res.status(200).json({
      products,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error fetching filtered products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get all products
router.get('/', async function(req: Request, res: Response) {
  try {
    const products = await prisma.product.findMany({
      include: {
        productSizes: true,
        category: true
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Search products
router.get('/search', asyncHandler(async (req: any, res: any) => {
  const { q } = req.query;
  
  if (!q) {
    return res.json([]);
  }
  
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } }
      ]
    },
    include: {
      category: true,
      productSizes: true  // Include sizes for complete product info
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  res.json(products);
}));


router.get('/:id', async function(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        productSizes: true,
        category: true
      }
    });
    
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product (admin only)
router.post('/', auth, async function(req: Request, res: Response) {
  try {
    const { 
      name, 
      description, 
      price, 
      categoryName,
      imageUrl, 
      stock, 
      featured,
      hasSizes,
      sizes
    } = req.body;
    
    if (!name || price === undefined) {
      res.status(400).json({ error: 'Name and price are required' });
      return;
    }
    
    // Prepare create data with proper type conversions
    const productData: any = {
      name,
      description,
      price: typeof price === 'string' ? parseFloat(price) : price,
      featured: featured === true || featured === 'true',
      hasSizes: hasSizes === true || hasSizes === 'true',
      stock: typeof stock === 'string' ? parseInt(stock, 10) : (stock || 0)
    };
    
    // Handle imageUrl correctly
    if (imageUrl !== undefined) {
      if (Array.isArray(imageUrl)) {
        productData.imageUrl = imageUrl;
      }
      else if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
        productData.imageUrl = [imageUrl];
      }
      else {
        productData.imageUrl = [];
      }
    }
    
 
    let sizesData = [];
    if (productData.hasSizes && Array.isArray(sizes) && sizes.length > 0) {
      sizesData = sizes;
      
      // Update the main stock to be the sum of all size stocks
      productData.stock = sizes.reduce((total, sizeItem) => {
        return total + (typeof sizeItem.stock === 'string' ? 
          parseInt(sizeItem.stock, 10) : (sizeItem.stock || 0));
      }, 0);
    }
    
    console.log('Creating product with data:', JSON.stringify(productData, null, 2));
    
    // Handle category - find or create by name
    let categoryId = null;
    if (categoryName) {
      let category = await prisma.category.findFirst({
        where: { name: categoryName }
      });
      
      if (!category) {
        category = await prisma.category.create({
          data: { 
            name: categoryName,
            description: '' 
          }
        });
        console.log(`Created new category: ${categoryName} with ID: ${category.id}`);
      } else {
        console.log(`Found existing category: ${categoryName} with ID: ${category.id}`);
      }
      
      categoryId = category.id;
    }

    // Create the product in a transaction with productSizes
    const product = await prisma.$transaction(async (prisma) => {
      // First create the product
      const newProduct = await prisma.product.create({
        data: {
          ...productData,
          categoryId
        }
      });
      
      // If the product has sizes, create the ProductSize records
      if (productData.hasSizes && sizesData.length > 0) {
        await Promise.all(sizesData.map(sizeItem => 
          prisma.productSize.create({
            data: {
              productId: newProduct.id,
              size: sizeItem.size,
              stock: typeof sizeItem.stock === 'string' ? 
                parseInt(sizeItem.stock, 10) : (sizeItem.stock || 0)
            }
          })
        ));
      }
      
      // Return the product with its sizes and category
      return prisma.product.findUnique({
        where: { id: newProduct.id },
        include: { 
          productSizes: true,
          category: true 
        }
      });
    });
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    
    if (error instanceof Error && error.name === 'PrismaClientValidationError') {
      res.status(400).json({ 
        error: 'Validation Error', 
        message: error.message,
        details: 'Check data types: price should be a number, stock should be an integer, imageUrl should be an array of strings'
      });
      return;
    }
    
    res.status(500).json({ error: 'Failed to create product', message: error instanceof Error ? error.message : String(error) });
  }
});

// Update product (admin only)
router.put('/:id', auth, async function(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      price, 
      categoryName,
      imageUrl, 
      stock, 
      featured, 
      hasSizes, 
      sizes 
    } = req.body;
    
    // Only include fields that are definitely in your schema
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    // Handle category by name
    if (categoryName !== undefined) {
      // If categoryName is empty string or null, set categoryId to null
      if (!categoryName) {
        updateData.categoryId = null;
      } else {
        // Find or create the category
        let category = await prisma.category.findFirst({
          where: { name: categoryName }
        });
        
        if (!category) {
          category = await prisma.category.create({
            data: { 
              name: categoryName,
              description: ''
            }
          });
        }
        
        updateData.categoryId = category.id;
      }
    }
    
    if (price !== undefined) {
      updateData.price = typeof price === 'string' ? parseFloat(price) : price;
    }
    if (featured !== undefined) {
      updateData.featured = featured === true || featured === 'true';
    }
    if (hasSizes !== undefined) {
      updateData.hasSizes = hasSizes === true || hasSizes === 'true';
    }
    
    // Handle imageUrl correctly
    if (imageUrl !== undefined) {
      if (Array.isArray(imageUrl)) {
        updateData.imageUrl = imageUrl;
      }
      else if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
        updateData.imageUrl = [imageUrl];
      }
      else {
        updateData.imageUrl = [];
      }
    }

    // Handle sizes and stock
    let sizesData = [];
    if (updateData.hasSizes && Array.isArray(sizes) && sizes.length > 0) {
      sizesData = sizes;
      
      // Update the main stock to be the sum of all size stocks
      updateData.stock = sizes.reduce((total, sizeItem) => {
        return total + (typeof sizeItem.stock === 'string' ? 
          parseInt(sizeItem.stock, 10) : (sizeItem.stock || 0));
      }, 0);
    } else if (stock !== undefined) {
      updateData.stock = typeof stock === 'string' ? parseInt(stock, 10) : stock;
    }

    console.log('Updating product with data:', JSON.stringify({ id, ...updateData }, null, 2));
    
    // Update in a transaction
    const product = await prisma.$transaction(async (prisma) => {
      // First update the product
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updateData
      });
      
      // If hasSizes is true and we have sizes, update the ProductSize records
      if (updateData.hasSizes && sizesData.length > 0) {
        // Delete existing sizes
        await prisma.productSize.deleteMany({
          where: { productId: id }
        });
        
        // Create new sizes
        await Promise.all(sizesData.map(sizeItem => 
          prisma.productSize.create({
            data: {
              productId: id,
              size: sizeItem.size,
              stock: typeof sizeItem.stock === 'string' ? 
                parseInt(sizeItem.stock, 10) : (sizeItem.stock || 0)
            }
          })
        ));
      } else if (hasSizes === false) {
        // If hasSizes is explicitly set to false, remove all sizes
        await prisma.productSize.deleteMany({
          where: { productId: id }
        });
      }
      
      // Return the updated product with its sizes and category
      return prisma.product.findUnique({
        where: { id },
        include: { 
          productSizes: true,
          category: true 
        }
      });
    });
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    
    if (error instanceof Error && error.name === 'PrismaClientValidationError') {
      res.status(400).json({ 
        error: 'Validation Error', 
        message: error.message,
        details: 'Check data types: price should be a number, stock should be an integer, imageUrl should be an array of strings'
      });
      return;
    }
    
    res.status(500).json({ error: 'Failed to update product', message: error instanceof Error ? error.message : String(error) });
  }
});

// Delete product (admin only)
router.delete('/:id', auth, async function(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    await prisma.product.delete({
      where: { id }
    });
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

router.get('/protected-route', auth, (req, res) => {
  res.json({ message: 'This is a protected route' });
});


export default router;