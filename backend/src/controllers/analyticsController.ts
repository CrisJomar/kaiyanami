import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    console.log("Generating analytics data...");
    
    // Get total revenue
    const ordersWithTotal = await prisma.order.findMany({
      select: {
        total: true,
        createdAt: true,
        status: true,
      },
    });
    
    const totalRevenue = ordersWithTotal.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Get revenue by month
    const currentYear = new Date().getFullYear();
    const revenueByMonth = Array(12).fill(0).map((_, i) => ({
      month: new Date(currentYear, i, 1).toLocaleString('default', { month: 'long' }),
      revenue: 0,
    }));
    
    ordersWithTotal.forEach(order => {
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        if (orderDate.getFullYear() === currentYear) {
          const monthIndex = orderDate.getMonth();
          revenueByMonth[monthIndex].revenue += order.total || 0;
        }
      }
    });
    
    // Get orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });
    
    const statusCounts = ordersByStatus.map(item => ({
      status: item.status || 'unknown',
      count: item._count.id,
    }));
    
    // Get top products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });
    
    const productIds = topProducts.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });
    
    const topProductsWithDetails = topProducts.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        id: item.productId,
        name: product?.name || 'Unknown Product',
        quantity: item._sum.quantity || 0,
        price: product?.price || 0,
      };
    });
    
    res.json({
      totalRevenue,
      revenueByMonth,
      ordersByStatus: statusCounts,
      topProducts: topProductsWithDetails,
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ error: 'Failed to generate analytics data' });
  }
};

const analyticsController = {
  // Get dashboard overview with real data
  getDashboardOverview: async (req: Request, res: Response) => {
    try {
      // Calculate date ranges
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      
      // Get today's orders
      const todayOrders = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
        _count: true,
        _sum: {
          total: true,
        },
      });
      
      // Get total orders
      const totalOrders = await prisma.order.aggregate({
        _count: true,
        _sum: {
          total: true,
        },
      });
      
      // Get orders by status
      const ordersByStatus = await prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });
      
      // Get monthly sales data
      const monthlySales = await prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: startOfLastMonth,
          },
          status: 'completed', // Only completed orders for revenue calculation
        },
        _sum: {
          total: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      
      // Format the response
      return res.status(200).json({
        success: true,
        data: {
          todaySales: todayOrders._sum.total || 0,
          todayOrders: todayOrders._count || 0,
          totalSales: totalOrders._sum.total || 0,
          totalOrders: totalOrders._count || 0,
          ordersByStatus: ordersByStatus.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
          }, {} as Record<string, number>),
          recentSales: monthlySales.map(sale => ({
            date: sale.createdAt,
            amount: sale._sum.total || 0,
          })),
        },
      });
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard overview',
      });
    }
  },

  // Sales over time with actual data
  getSalesOverTime: async (req: Request, res: Response) => {
    try {
      const { period = 'daily', startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Get orders within date range
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
          status: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      
      // Group orders by period
      const groupedData = new Map();
      
      orders.forEach(order => {
        const date = new Date(order.createdAt);
        let key;
        
        if (period === 'daily') {
          key = date.toISOString().split('T')[0];
        } else if (period === 'weekly') {
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          key = `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
        } else {
          key = date.toISOString().slice(0, 7); // YYYY-MM
        }
        
        if (!groupedData.has(key)) {
          groupedData.set(key, { date: key, revenue: 0, orders: 0 });
        }
        
        const entry = groupedData.get(key);
        entry.revenue += parseFloat(order.total.toString());
        entry.orders += 1;
      });
      
      // Convert map to array and sort by date
      const result = Array.from(groupedData.values())
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return res.json(result);
    } catch (error) {
      console.error('Error generating sales over time data:', error);
      return res.status(500).json({ error: 'Failed to generate time series data' });
    }
  },

  // Get top products by sales
  getTopProducts: async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get top products by order quantity
      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
          price: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
      });
      
      // Get product details
      const products = await Promise.all(
        topProducts.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
            },
          });
          
          return {
            id: item.productId,
            name: product?.name || 'Unknown Product',
            totalQuantity: item._sum.quantity || 0,
            totalRevenue: item._sum.price || 0,
            price: product?.price || 0,
            imageUrl: product?.imageUrl?.[0] || null,
          };
        })
      );
      
      return res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error('Error fetching top products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch top products',
      });
    }
  },

  // Get revenue summary
  getRevenueSummary: async (req: Request, res: Response) => {
    try {
      // Calculate date ranges
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      // Get daily revenue
      const dailyRevenue = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfDay,
          },
          status: 'completed', // Only count completed orders
        },
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
      });
      
      // Get weekly revenue
      const weeklyRevenue = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfWeek,
          },
          status: 'completed',
        },
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
      });
      
      // Get monthly revenue
      const monthlyRevenue = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
          status: 'completed',
        },
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
      });
      
      // Get yearly revenue
      const yearlyRevenue = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfYear,
          },
          status: 'completed',
        },
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
      });
      
      return res.status(200).json({
        success: true,
        data: {
          daily: {
            revenue: dailyRevenue._sum.total || 0,
            orders: dailyRevenue._count.id || 0,
          },
          weekly: {
            revenue: weeklyRevenue._sum.total || 0,
            orders: weeklyRevenue._count.id || 0,
          },
          monthly: {
            revenue: monthlyRevenue._sum.total || 0,
            orders: monthlyRevenue._count.id || 0,
          },
          yearly: {
            revenue: yearlyRevenue._sum.total || 0,
            orders: yearlyRevenue._count.id || 0,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue summary',
      });
    }
  },

  // Recent orders
  getRecentOrders: async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const recentOrders = await prisma.order.findMany({
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  imageUrl: true,
                }
              }
            }
          },
        },
      });
      
      // Format the response
      const formattedOrders = recentOrders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        total: order.total,
        customer: order.user 
          ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email
          : `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim() || order.guestEmail || 'Guest',
        items: order.orderItems.length,
        products: order.orderItems.map(item => ({
          name: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.price,
          image: item.product?.imageUrl?.[0] || null,
        })),
      }));
      
      return res.status(200).json({
        success: true,
        data: formattedOrders,
      });
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recent orders',
      });
    }
  },

  // Customer analytics
  getCustomerAnalytics: async (req: Request, res: Response) => {
    try {
      // Get registered vs guest orders
      const registeredOrders = await prisma.order.count({
        where: {
          userId: {
            not: null,
          },
        },
      });
      
      const totalOrders = await prisma.order.count();
      const guestOrders = totalOrders - registeredOrders;
      
      // Get returning vs new customers
      const usersWithOrders = await prisma.user.findMany({
        where: {
          orders: {
            some: {},
          },
        },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });
      
      const repeatCustomers = usersWithOrders.filter(user => user._count.orders > 1).length;
      const customersWithOrders = usersWithOrders.length;
      const newCustomers = customersWithOrders - repeatCustomers;
      
      // Get average order value
      const orderStats = await prisma.order.aggregate({
        where: {
          status: 'completed',
        },
        _avg: {
          total: true,
        },
        _sum: {
          total: true,
        },
      });
      
      return res.status(200).json({
        success: true,
        data: {
          registeredVsGuest: {
            registered: registeredOrders,
            guest: guestOrders,
            total: totalOrders,
          },
          customerRetention: {
            returning: repeatCustomers,
            new: newCustomers,
            total: customersWithOrders,
          },
          averageOrderValue: orderStats._avg.total || 0,
          totalRevenue: orderStats._sum.total || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch customer analytics',
      });
    }
  }
};

export default analyticsController;