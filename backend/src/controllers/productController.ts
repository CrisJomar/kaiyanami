import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

// Extend Express Request type to include user property
// Define our own User interface
interface User {
  id: string;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      [key: string]: any;
    }
  }
}

const prisma = new PrismaClient();

const productController = {
  // Method to get all products
  getAll: async (req: Request, res: Response) => {
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
      res.status(500).json({ message: 'Error retrieving products' });
    }
  },
  
};

export default productController;

export class ProductController {
  // PUBLIC METHODS
  static async getAll(req: Request, res: Response) {
    try {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Error fetching products' });
    }
  }
  
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`Looking up product with ID: "${id}", type: ${typeof id}`);
      
      if (!id) {
        console.log("No ID provided");
        return res.status(400).json({ message: "Product ID is required" });
      }
      
      // Log the exact query we're about to make
      console.log(`Finding product where id = "${id}"`);
      
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          productSizes: true,
          category: true
        }
      });
      
      if (!product) {
        console.log(`No product found with ID: "${id}"`);
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log(`Found product: ${product.name} (ID: ${product.id})`);
      
      // Transform productSizes to sizes for the frontend
      const transformedProduct = {
        ...product,
        sizes: product.productSizes?.map(size => ({
          size: size.size,
          stock: size.stock
        })) || []
      };
      
      return res.json(transformedProduct);
    } catch (error) {
      console.error("Error in getById:", error);
      res.status(500).json({ message: "Error retrieving product" });
    }
  }
  
  static async getByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      
      // First find the category by name
      const categoryObj = await prisma.category.findFirst({
        where: { name: category }
      });
      
      if (!categoryObj) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      const products = await prisma.product.findMany({
        where: { categoryId: categoryObj.id },
        include: {
          productSizes: true,
          category: true
        }
      });
      
      res.json(products);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      res.status(500).json({ message: 'Error fetching products by category' });
    }
  }
  
  static async getFeatured(req: Request, res: Response) {
    try {
      
      const products = await prisma.product.findMany({
        take: 4, // Limit to 4 featured products
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(products);
    } catch (error) {
      console.error('Error fetching featured products:', error);
      res.status(500).json({ message: 'Error fetching featured products' });
    }
  }
  
  static async search(req: Request, res: Response) {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(products);
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ message: 'Error searching products' });
    }
  }
  
  static async getUserViewHistory(req: Request, res: Response) {
    try {
      res.json([]);
    } catch (error) {
      console.error('Error fetching user view history:', error);
      res.status(500).json({ message: 'Error fetching user view history' });
    }
  }
  
  // ADMIN METHODS
  
  // Create product
  static async create(req: Request, res: Response) {
    try {
      const { 
        name, 
        description, 
        price, 
        categoryName,  // Note: changed from 'category' to 'categoryName'
        imageUrl, 
        stock, 
        featured,
        hasSizes,
        sizes,
        discountPercentage
      } = req.body;
      
      if (!name || price === undefined) {
        return res.status(400).json({ message: 'Name and price are required' });
      }
      
      // Create basic product data
      const productData: any = {
        name,
        price: parseFloat(price)
      };
      
      // Add optional fields if they exist
      if (description !== undefined) productData.description = description;
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
        }
        
        productData.categoryId = category.id;
      }
      if (stock !== undefined) productData.stock = parseInt(stock);
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
      if (featured !== undefined) productData.featured = Boolean(featured);
      if (hasSizes !== undefined) productData.hasSizes = Boolean(hasSizes);
      if (discountPercentage !== undefined) productData.discountPercentage = parseFloat(discountPercentage);

      const product = await prisma.$transaction(async (tx) => {
        const newProduct = await tx.product.create({
          data: productData
        });
        
        // Create size records if needed
        if (productData.hasSizes && Array.isArray(sizes) && sizes.length > 0) {
          await Promise.all(sizes.map(sizeItem => 
            tx.productSize.create({
              data: {
                productId: newProduct.id,
                size: sizeItem.size,
                stock: typeof sizeItem.stock === 'string' ? 
                  parseInt(sizeItem.stock, 10) : (sizeItem.stock || 0)
              }
            })
          ));
        }
        
        return tx.product.findUnique({
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
      res.status(500).json({ 
        message: 'Error creating product',
        error: String(error)
      });
    }
  }
  
  // Update product
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        name, 
        description, 
        price, 
        categoryName,  // Note: changed from 'category' to 'categoryName'
        imageUrl, 
        stock, 
        featured, 
        hasSizes, 
        sizes,
        discountPercentage
      } = req.body;
      
      const productExists = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!productExists) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Only update provided fields
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (categoryName !== undefined) {
        if (!categoryName) {
          // If empty, set to null
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
      if (featured !== undefined) updateData.featured = Boolean(featured);
      if (hasSizes !== undefined) updateData.hasSizes = Boolean(hasSizes);
      if (discountPercentage !== undefined) updateData.discountPercentage = parseFloat(discountPercentage);
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
      if (hasSizes && Array.isArray(sizes)) {
        console.log('Processing sizes:', sizes.length, 'items');
        
        // Delete existing sizes
        const deletedSizes = await prisma.productSize.deleteMany({
          where: { productId: id }
        });
        console.log('Deleted sizes:', deletedSizes.count);
        
        // Add new sizes one by one
        if (sizes.length > 0) {
          const createdSizes = [];
          
          for (const size of sizes) {
            console.log('Creating size:', size);
            const created = await prisma.productSize.create({
              data: {
                productId: id,
                size: size.size,
                stock: parseInt(size.stock || 0)
              }
            });
            createdSizes.push(created);
          }
          
          console.log('Created sizes:', createdSizes.length);
          
          // Calculate and update total stock
          const totalStock = sizes.reduce((total, size) => total + parseInt(size.stock || 0), 0);
          console.log('Total stock calculated:', totalStock);
          
          await prisma.product.update({
            where: { id },
            data: { stock: totalStock }
          });
        }
      } else if (!hasSizes) {
        // Remove all sizes if product no longer has sizes
        await prisma.productSize.deleteMany({
          where: { productId: id }
        });
        console.log('Product does not have sizes - deleted any existing sizes');
      }
      
      const product = await prisma.product.update({
        where: { id },
        data: updateData
      });
      
      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Error updating product' });
    }
  }
  
  // Delete product with schema-neutral safety checks
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const product = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Check for existing orders with this product - adapt to your schema
      try {
        const orderItemsWithProduct = await prisma.orderItem.findMany({
          where: { productId: id }
        });
        
        if (orderItemsWithProduct.length > 0) {
          return res.status(400).json({
            message: 'Cannot delete product that is referenced in orders',
            orderCount: orderItemsWithProduct.length
          });
        }
      } catch (error) {
        // OrderItem might not exist in schema, continue with delete
        console.log('OrderItem check skipped');
      }
      
      // Check for cart items - adapt to your schema
      try {
        const cartItemsWithProduct = await prisma.cartItem.findMany({
          where: { productId: id }
        });
        
        if (cartItemsWithProduct.length > 0) {
          return res.status(400).json({
            message: 'Cannot delete product that is in users\' carts',
            cartCount: cartItemsWithProduct.length
          });
        }
      } catch (error) {
        // CartItem might not exist in schema, continue with delete
        console.log('CartItem check skipped');
      }
      
      await prisma.product.delete({
        where: { id }
      });
      
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Error deleting product' });
    }
  }
  
  // Get inventory
  static async getInventory(req: Request, res: Response) {
    try {
      // Extract query parameters
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const sortField = req.query.sortField as string || 'updatedAt';
      const sortDirection = req.query.sortDirection as string || 'desc';
  
      console.log('Product search params:', { 
        page, limit, search, category, sortField, sortDirection 
      });
  
      // Build where clause
      const whereClause: any = {};
      
      // Add search condition if provided
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Add category filter if provided
      if (category) {
        whereClause.category = category;
      }
  
      // Build sort object
      const orderBy: any = {};
      orderBy[sortField] = sortDirection.toLowerCase();
  
      // Get products with filtering, sorting and pagination
      const products = await prisma.product.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit
      });
      
      // Get total count for pagination
      const total = await prisma.product.count({
        where: whereClause
      });
  
      return res.status(200).json({
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Error fetching product inventory:', error);
      return res.status(500).json({ message: 'Error fetching products' });
    }
  }
  
  // Update inventory
  static async updateInventory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { stock } = req.body;
      
      if (stock === undefined) {
        return res.status(400).json({ message: 'Stock quantity is required' });
      }
      
      const product = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      try {
        const updatedProduct = await prisma.product.update({
          where: { id },
          data: {
            stock: parseInt(stock)
          }
        });
        
        res.json(updatedProduct);
      } catch (error) {
        // If stock field doesn't exist in the schema
        return res.status(400).json({ 
          message: 'Stock field does not exist in the Product model'
        });
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({ message: 'Error updating inventory' });
    }
  }
  
  // Get all categories
  static async getAllCategories(req: Request, res: Response) {
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
  }
  
  // Create category (for admin dashboard organization)
  static async createCategory(req: Request, res: Response) {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
      }
      
      // Check if any product already has this category
      const existingProduct = await prisma.product.findFirst({
        where: {
          category: {
            name: {
              equals: name,
              mode: 'insensitive'
            }
          }
        }
      });
      
      // If not, create a sample product with this category
      if (!existingProduct) {
        await prisma.product.create({
          data: {
            name: `Sample ${name} Product`,
            description: 'This is a sample product for the new category',
            price: 0,
            category: name,
            stock: 0
          }
        });
      }
      
      // Return success
      res.status(201).json({ 
        message: 'Category created successfully',
        name
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ message: 'Error creating category' });
    }
  }
  
  // Update category (batch update products with this category)
  static async updateCategory(req: Request, res: Response) {
    try {
      const { id: oldName } = req.params;
      const { name: newName } = req.body;
      
      if (!newName) {
        return res.status(400).json({ message: 'New category name is required' });
      }
      
      // First find the old category
      const oldCategory = await prisma.category.findFirst({
        where: { name: { equals: oldName, mode: 'insensitive' } }
      });
      
      if (!oldCategory) {
        return res.status(404).json({ message: 'Original category not found' });
      }
      
      // Find or create the new category
      let newCategory = await prisma.category.findFirst({
        where: { name: { equals: newName, mode: 'insensitive' } }
      });
      
      if (!newCategory) {
        newCategory = await prisma.category.create({
          data: {
            name: newName,
            description: ''
          }
        });
      }
      
      // Update all products with this category
      const result = await prisma.product.updateMany({
        where: {
          categoryId: oldCategory.id
        },
        data: {
          categoryId: newCategory.id
        }
      });
      
      res.json({ 
        message: `Category updated successfully`,
        productsUpdated: result.count
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'Error updating category' });
    }
  }

  static async getProductReviews(req: Request, res: Response) {
    try {
      const { status } = req.query; // 'pending', 'approved', 'rejected'
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      
      // Type-safe way to create the where clause for Prisma
      const whereClause: any = {}; 
      if (status) {
        whereClause.status = { equals: status as string };
      }
      
      const reviews = await prisma.review.findMany({
        where: whereClause,
        include: {
          product: {
            select: { name: true, imageUrl: true }
          },
          user: {
            select: { email: true }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });
      
      const total = await prisma.review.count({ where: whereClause });
      
      res.json({
        reviews,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Error fetching reviews' });
    }
  }

  static async updateReviewStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const review = await prisma.review.update({
        where: { id },
        data: { status } as any
      });
      
      res.json(review);
    } catch (error) {
      console.error('Error updating review:', error);
      res.status(500).json({ message: 'Error updating review' });
    }
  }

  static async getSalesAnalytics(req: Request, res: Response) {
    try {
      const { period } = req.query; // 'day', 'week', 'month', 'year'
      
      let dateFilter = {};
      const now = new Date();
      
      switch(period) {
        case 'day':
          dateFilter = { 
            gte: new Date(now.setHours(0,0,0,0))
          };
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          dateFilter = { gte: weekStart };
          break;
        case 'month':
          dateFilter = { 
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          };
          break;
        case 'year':
          dateFilter = { 
            gte: new Date(now.getFullYear(), 0, 1)
          };
          break;
        default:
          dateFilter = { 
            gte: new Date(now.setMonth(now.getMonth() - 1))
          };
      }
      
      const orders = await prisma.order.findMany({
        where: {
          createdAt: dateFilter,
          status: { not: 'CANCELLED' }
        },
        include: {
          orderItems: true
        }
      });
      
      // Calculate revenue, average order value, etc.
      const totalRevenue = orders.reduce((sum, order) => {
        const orderTotal = order.orderItems.reduce(
          (itemSum, item) => itemSum + (item.price * item.quantity), 
          0
        );
        return sum + orderTotal;
      }, 0);
      
      const averageOrderValue = orders.length > 0 
        ? totalRevenue / orders.length 
        : 0;
      
      // Top selling products
      const productSales: Record<string, number> = {};
      orders.forEach(order => {
        order.orderItems.forEach(item => {
          if (productSales[item.productId]) {
            productSales[item.productId] += item.quantity;
          } else {
            productSales[item.productId] = item.quantity;
          }
        });
      });
      
      const topProducts = Object.entries(productSales)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5);
      
      res.json({
        totalOrders: orders.length,
        totalRevenue,
        averageOrderValue,
        topProducts
      });
    } catch (error) {
      console.error('Error generating analytics:', error);
      res.status(500).json({ message: 'Error generating analytics' });
    }
  }

  static async getCustomers(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const search = req.query.search as string;
      
      const whereClause = search ? {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } }
        ]
      } : {};
      
      const customers = await prisma.user.findMany({
        where: {
          ...whereClause,
          role: 'customer' // Only get customers, not admins
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          _count: {
            select: { orders: true }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });
      
      const total = await prisma.user.count({
        where: {
          ...whereClause,
          role: 'customer'
        }
      });
      
      res.json({
        customers,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Error fetching customers' });
    }
  }

  static async getCustomerDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const customer = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          createdAt: true,
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      res.status(500).json({ message: 'Error fetching customer details' });
    }
  }
}

// Get all products
export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        productSizes: true
      }
    });

    // Transform the response to include sizes
    const transformedProducts = products.map(product => ({
      ...product,
      sizes: product.productSizes?.map(size => ({
        size: size.size,
        stock: size.stock
      })) || []
    }));

    res.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productSizes: true,
        category: true
      }
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Log the raw product
    console.log('Raw product from database:');
    console.log('- id:', product.id);
    console.log('- name:', product.name);
    console.log('- hasSizes:', product.hasSizes);
    console.log('- productSizes.length:', product.productSizes.length);
    
    // Create a plain object from the Prisma model
    const plainProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      stock: product.stock,
      hasSizes: product.hasSizes,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      
      // Explicitly map the sizes array
      sizes: product.productSizes.map(ps => ({
        size: ps.size,
        stock: ps.stock
      }))
    };
    
    // Log what we're sending
    console.log('Sending transformed product:');
    console.log('- sizes array length:', plainProduct.sizes.length);
    console.log('- first size:', plainProduct.sizes[0]);
    
    // Send the response
    return res.json(plainProduct);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Create product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description, 
      price, 
      categoryName, // Make sure it's consistently named 
      stock, 
      imageUrl, 
      featured,
      hasSizes,
      sizes,
      discountPercentage 
    } = req.body;
    
    console.log('Creating product with data:', { 
      name, price, categoryName, featured, hasSizes 
    });
    
    // Create basic product data with proper type conversions
    const productData: any = {
      name,
      description: description || '',
      price: typeof price === 'string' ? parseFloat(price) : price,
      stock: typeof stock === 'string' ? parseInt(stock) : (stock || 0),
      featured: featured === true || featured === 'true',
      hasSizes: hasSizes === true || hasSizes === 'true',
      discountPercentage: typeof discountPercentage === 'string' ? 
        parseFloat(discountPercentage) : (discountPercentage || 0)
    };
    
    // Handle category
    if (categoryName) {
      console.log('Processing category:', categoryName);
      // Find or create the category
      let category = await prisma.category.findFirst({
        where: { name: categoryName }
      });
      
      if (!category) {
        console.log('Creating new category:', categoryName);
        category = await prisma.category.create({
          data: {
            name: categoryName,
            description: ''
          }
        });
        console.log('Created new category with ID:', category.id);
      } else {
        console.log('Found existing category with ID:', category.id);
      }
      
      // Set the categoryId on the product
      productData.categoryId = category.id;
      
      console.log('Set categoryId to:', category.id);
    } else {
      console.log('No category provided');
    }
    
    // Rest of your product creation logic...
    
    // Ensure you return the product with its category
    const createdProduct = await prisma.product.create({
      data: productData,
      include: {
        category: true,
        productSizes: true
      }
    });
    
    console.log('Product created with categoryId:', createdProduct.categoryId);
    console.log('Category data:', createdProduct.category);
    
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      message: 'Error creating product',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      price, 
      categoryName, // Changed from category
      stock, 
      imageUrl, 
      featured,
      hasSizes,
      discountPercentage,
      sizes 
    } = req.body;
    
    console.log('Updating product ID:', id);
    console.log('Request body:', req.body);
    console.log('Has sizes:', hasSizes);
    console.log('Sizes array:', sizes);
    
    // Start a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get existing product data including sizes
      const existingProduct = await tx.product.findUnique({
        where: { id },
        include: { productSizes: true, category: true }
      });
      
      if (!existingProduct) {
        throw new Error('Product not found');
      }
      
      // Prepare update data
      const updateData: any = {};
      
      // Only update fields that were provided
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      
      // Handle category
      if (categoryName !== undefined) {
        if (!categoryName) {
          updateData.categoryId = null;
        } else {
          // Find or create category by name
          let category = await tx.category.findFirst({
            where: { name: categoryName }
          });
          
          if (!category) {
            category = await tx.category.create({
              data: { 
                name: categoryName,
                description: ''
              }
            });
          }
          
          updateData.categoryId = category.id;
        }
      }
      
      if (featured !== undefined) updateData.featured = featured === true || featured === 'true';
      if (discountPercentage !== undefined) {
        updateData.discountPercentage = typeof discountPercentage === 'string' ? 
          parseFloat(discountPercentage) : discountPercentage;
      }
      
      // Handle imageUrl
      if (imageUrl !== undefined) {
        if (Array.isArray(imageUrl)) {
          updateData.imageUrl = imageUrl;
        } else if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          updateData.imageUrl = [imageUrl];
        } else {
          updateData.imageUrl = [];
        }
      }
      
      // Handle sizes only if hasSizes field was actually changed or sizes array was provided
      const hasSizesChanged = hasSizes !== undefined && hasSizes !== existingProduct.hasSizes;
      const sizesProvided = Array.isArray(sizes) && sizes.length > 0;
      
      // Update hasSizes flag if provided
      if (hasSizes !== undefined) {
        updateData.hasSizes = hasSizes === true || hasSizes === 'true';
      }
      
      // Only modify sizes if hasSizes was changed or sizes were provided
      if (hasSizesChanged || sizesProvided) {
        // If product should have sizes
        if (updateData.hasSizes) {
          // If sizes were provided, update them
          if (sizesProvided) {
            console.log('Processing new sizes:', sizes.length, 'items');
            
            // Delete existing sizes
            const deletedSizes = await tx.productSize.deleteMany({
              where: { productId: id }
            });
            console.log('Deleted sizes:', deletedSizes.count);
            
            // Add new sizes
            for (const size of sizes) {
              console.log('Creating size:', size);
              await tx.productSize.create({
                data: {
                  productId: id,
                  size: size.size,
                  stock: parseInt(size.stock || 0)
                }
              });
            }
            
            // Calculate and update total stock
            const totalStock = sizes.reduce((total, size) => total + parseInt(size.stock || 0), 0);
            console.log('Total stock calculated:', totalStock);
            updateData.stock = totalStock;
          } else if (hasSizesChanged && !existingProduct.hasSizes) {
            // If hasSizes changed from false to true but no sizes provided,
            // create a default size
            await tx.productSize.create({
              data: {
                productId: id,
                size: 'Default',
                stock: existingProduct.stock || 0
              }
            });
            console.log('Created default size with stock:', existingProduct.stock);
          }
          // If hasSizes is true and wasn't changed, and no new sizes were provided,
          // keep existing sizes (do nothing)
        } else {
          // If hasSizes is false, delete all sizes
          await tx.productSize.deleteMany({
            where: { productId: id }
          });
          console.log('Product does not have sizes - deleted any existing sizes');
          
          // If stock was provided, use it, otherwise use existing stock
          if (stock !== undefined) {
            updateData.stock = parseInt(stock || 0);
          }
        }
      } else if (stock !== undefined && !existingProduct.hasSizes) {
        // Only update stock directly if hasSizes is false and stock was provided
        updateData.stock = parseInt(stock || 0);
      }
      
      // Update the product
      const updatedProduct = await tx.product.update({
        where: { id },
        data: updateData
      });
      
      // Return updated product with sizes
      return await tx.product.findUnique({
        where: { id },
        include: { 
          productSizes: true,
          category: true 
        }
      });
    });
    
    if (!result) {
      throw new Error('Failed to update product');
    }
    
    // Transform the response
    const transformedProduct = {
      ...result,
      sizes: result.productSizes.map(size => ({
        size: size.size,
        stock: size.stock
      }))
    };
    
    console.log('Product updated successfully with sizes:', transformedProduct.sizes?.length || 0);
    
    res.json(transformedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check for existing relationships (to avoid constraint errors)
    const hasCartItems = await prisma.cartItem.findFirst({
      where: { productId: id }
    });
    
    if (hasCartItems) {
      return res.status(400).json({ 
        message: 'Cannot delete product as it exists in customer carts' 
      });
    }
    
    const hasOrderItems = await prisma.orderItem.findFirst({
      where: { productId: id }
    });
    
    if (hasOrderItems) {
      return res.status(400).json({ 
        message: 'Cannot delete product as it exists in customer orders' 
      });
    }
    
    // Delete product
    await prisma.product.delete({
      where: { id }
    });
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
};

// Get products by category
export const getProductsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    // First find the category by name
    const categoryObj = await prisma.category.findFirst({
      where: { name: { contains: category, mode: 'insensitive' } }
    });
    
    if (!categoryObj) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Then query products with this categoryId
    const products = await prisma.product.findMany({
      where: { categoryId: categoryObj.id },
      orderBy: { createdAt: 'desc' },
      include: {
        productSizes: true
      }
    });
    
    // Transform products for consistent response
    const transformedProducts = products.map(product => ({
      ...product,
      sizes: product.productSizes?.map(size => ({
        size: size.size,
        stock: size.stock
      })) || []
    }));
    
    res.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ message: 'Error fetching products by category' });
  }
};

// Search products
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { 
            category: {
              name: { contains: query, mode: 'insensitive' }
            }
          }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Error searching products' });
  }
};

// Get all products with sizes
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      include: {
        productSizes: true
      }
    });

    // Add this transformation
    const transformedProducts = products.map(product => ({
      ...product,
      sizes: product.productSizes?.map(size => ({
        size: size.size,
        stock: size.stock
      })) || []
    }));

    res.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single product with sizes
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Add debug log
    console.log('Fetching product ID:', id);
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productSizes: true,
        // Include any other relations you already have
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    // Debug log the database result
    console.log('Product from database:', {
      id: product.id,
      name: product.name,
      hasSizes: product.hasSizes,
      productSizesCount: product.productSizes?.length || 0
    });
    
    // Important: Transform the productSizes to a sizes array in the response
    const transformedProduct = {
      ...product,
      sizes: product.productSizes?.map(size => ({
        size: size.size,
        stock: size.stock
      })) || []
    };
    
    res.json(transformedProduct);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

