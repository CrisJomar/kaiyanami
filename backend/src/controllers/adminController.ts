import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface AdminDashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalProducts: number;
  revenue: number;
  pendingOrders: number;
  lowStockProducts: number;
  pendingReviews: number;
}

// Create a comprehensive admin controller with all methods
const adminController = {
  // Dashboard stats
  getDashboardStats: async (req: Request, res: Response) => {
    try {
      // Get total users
      const totalUsers = await prisma.user.count();
      
      // Get total orders
      const totalOrders = await prisma.order.count();
      
      // Get total products
      const totalProducts = await prisma.product.count();
      
      // Calculate revenue
      const orders = await prisma.order.findMany({
        where: {
          paymentStatus: 'paid'
        },
        select: {
          total: true
        }
      });
      
      const revenue = orders.reduce((total, order) => total + order.total, 0);
      
      // Get pending orders
      const pendingOrders = await prisma.order.count({
        where: {
          status: 'pending'
        }
      });
      
      // Get low stock products
      const lowStockProducts = await prisma.product.count({
        where: {
          stock: {
            lt: 10
          }
        }
      });
      // Get pending reviews
      const pendingReviews = 0;
      
      const stats = {
        totalUsers,
        totalOrders,
        totalProducts,
        revenue,
        pendingOrders,
        lowStockProducts,
        pendingReviews
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error getting admin stats:', error);
      res.status(500).json({ message: 'Failed to get admin dashboard stats' });
    }
  },

  // User management methods
  getAllUsers: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Error fetching users' });
    }
  },

  getUserById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          orders: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              total: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5 // Only get the 5 most recent orders
          }
        }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Error fetching user' });
    }
  },

  createUser: async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create user
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: firstName || '',
          lastName: lastName || '',
          role: role || 'user'
        }
      });
      
      
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Error creating user' });
    }
  },

  updateUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email, password, firstName, lastName, role } = req.body;
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prepare update data
      const updateData: any = {};
      
      if (email !== undefined) updateData.email = email;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (role !== undefined) updateData.role = role;
      
      // Only hash and update password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }
      
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Error updating user' });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prevent deleting the last admin
      if (user.role === 'admin') {
        const adminCount = await prisma.user.count({
          where: { role: 'admin' }
        });
        
        if (adminCount <= 1) {
          return res.status(400).json({ 
            message: 'Cannot delete the only admin. Create another admin user first.' 
          });
        }
      }
      
      await prisma.$transaction(async (tx) => {
        const userId = req.params.id; 

        await tx.cartItem.deleteMany({
          where: { userId }
        });

        await tx.cart.deleteMany({
          where: { userId }
        });

        await tx.savedAddress.deleteMany({
          where: { userId }
        });

        await tx.address.deleteMany({
          where: { userId }
        });
        
        
        await tx.order.updateMany({
          where: { userId },
          data: { userId: null } 
        });

        await tx.review.deleteMany({
          where: { userId }
        });


        await tx.wishlist.deleteMany({
          where: { userId }
        });

        await tx.supportTicket.updateMany({
          where: { userId },
          data: { userId: null }
        });

        await tx.user.delete({
          where: { id: userId }
        });
      });
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Error deleting user' });
    }
  },

  // Product management methods
  getAllProducts: async (req: Request, res: Response) => {
    try {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  },

  createProduct: async (req: Request, res: Response) => {
    try {
      const { 
        name, 
        description, 
        price, 
        category,
        stock, 
        imageUrl,
        featured 
      } = req.body;
      
      if (!name || !price || !category) {
        return res.status(400).json({ 
          message: 'Missing required fields (name, price, category)'
        });
      }
      
      const product = await prisma.product.create({
        data: {
          name,
          description: description || '',
          price: parseFloat(price),
          category,
          stock: stock ? parseInt(stock) : 0,
          imageUrl: Array.isArray(imageUrl) ? imageUrl : [imageUrl],
          featured: Boolean(featured || false)
        }
      });
      
      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: String(error)
      });
    }
  },

  updateProduct: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { 
        name, 
        description, 
        price, 
        category,
        stock, 
        imageUrl,
        featured 
      } = req.body;
      
      // Check if product exists
      const productExists = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!productExists) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Only update fields that are provided
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (category !== undefined) updateData.category = category;
      if (stock !== undefined) updateData.stock = parseInt(stock);
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (featured !== undefined) updateData.featured = Boolean(featured);
      
      const product = await prisma.product.update({
        where: { id },
        data: updateData
      });
      
      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Failed to update product' });
    }
  },

  deleteProduct: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      await prisma.product.delete({
        where: { id }
      });
      
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Failed to delete product' });
    }
  },

  // Order management methods
  getAllOrders: async (req: Request, res: Response) => {
    try {
      const orders = await prisma.order.findMany({
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  },

  updateOrderStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const order = await prisma.order.update({
        where: { id },
        data: { status }
      });
      
      res.json(order);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  }
};

export default adminController;