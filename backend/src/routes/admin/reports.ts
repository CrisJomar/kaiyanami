import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, isAdmin } from '../../utils/middlewareHelpers';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { createObjectCsvStringifier } from 'csv-writer';
import PDFDocument from 'pdfkit';
import { Workbook } from 'exceljs';

const router = Router();
const prisma = new PrismaClient();

// Type definitions for report data
interface ReportData {
  labels: string[];
  data: number[];
  columns: string[];
  rows: (string | number)[][];
  dateRange: { start: string; end: string };
}

// Shared report generation functions
async function generateSalesReport(startDate: string | undefined, endDate: string | undefined): Promise<ReportData> {
  // Default to last 7 days if no dates provided
  const start = startDate ? parseISO(String(startDate)) : subDays(new Date(), 7);
  const end = endDate ? parseISO(String(endDate)) : new Date();
  
  // Get orders within date range using Prisma
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end
      },
      status: {
        not: 'cancelled'
      }
    },
    select: {
      id: true,
      total: true,
      createdAt: true
    }
  });
  
  // Group orders by date
  const salesByDate = orders.reduce((acc: Record<string, {totalSales: number, orderCount: number}>, order) => {
    const dateKey = format(order.createdAt, 'yyyy-MM-dd');
    
    if (!acc[dateKey]) {
      acc[dateKey] = { totalSales: 0, orderCount: 0 };
    }
    
    acc[dateKey].totalSales += Number(order.total);
    acc[dateKey].orderCount += 1;
    
    return acc;
  }, {});
  
  // Sort dates and prepare data for response
  const sortedDates = Object.keys(salesByDate).sort();
  
  const labels: string[] = [];
  const data: number[] = [];
  const rows: (string | number)[][] = [];
  
  sortedDates.forEach(dateKey => {
    const { totalSales, orderCount } = salesByDate[dateKey];
    labels.push(format(new Date(dateKey), 'MMM dd'));
    data.push(Number(totalSales.toFixed(2)));
    rows.push([
      dateKey,
      Number(totalSales.toFixed(2)),
      orderCount
    ]);
  });
  
  return {
    labels,
    data,
    columns: ['Date', 'Total Sales ($)', 'Order Count'],
    rows,
    dateRange: { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
  };
}

// Similar functions for other report types
async function generateProductsReport(startDate: string | undefined, endDate: string | undefined): Promise<ReportData> {
  const start = startDate ? parseISO(String(startDate)) : subDays(new Date(), 30);
  const end = endDate ? parseISO(String(endDate)) : new Date();
  
  // Get top selling products within date range
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: {
          gte: start,
          lte: end
        },
        status: {
          not: 'cancelled'
        }
      }
    },
    include: {
      product: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  // Calculate product performance metrics
  const productPerformance = orderItems.reduce((acc: Record<string, {
    productId: string,
    name: string,
    quantity: number,
    revenue: number
  }>, item) => {
    const productId = item.productId;
    
    if (!acc[productId]) {
      acc[productId] = {
        productId,
        name: item.product?.name || 'Unknown Product',
        quantity: 0,
        revenue: 0
      };
    }
    
    acc[productId].quantity += item.quantity;
    acc[productId].revenue += Number(item.price) * item.quantity;
    
    return acc;
  }, {});
  
  // Convert to array and sort by quantity
  const productData = Object.values(productPerformance)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10); // Top 10 products
  
  const labels = productData.map(p => p.name);
  const data = productData.map(p => p.quantity);
  const rows = productData.map(p => [
    p.name,
    p.quantity,
    p.revenue.toFixed(2)
  ]);
  
  return {
    labels,
    data,
    columns: ['Product', 'Units Sold', 'Revenue ($)'],
    rows,
    dateRange: { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
  };
}

async function generateCustomersReport(startDate: string | undefined, endDate: string | undefined): Promise<any> {
  const start = startDate ? parseISO(String(startDate)) : subDays(new Date(), 30);
  const end = endDate ? parseISO(String(endDate)) : new Date();
  
  // Get user registrations within date range
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end
      }
    },
    select: {
      id: true,
      createdAt: true,
      email: true,
      firstName: true,
      lastName: true
    }
  });
  
  // Group users by registration date
  const usersByDate = users.reduce((acc: Record<string, number>, user) => {
    const dateKey = format(user.createdAt, 'yyyy-MM-dd');
    
    if (!acc[dateKey]) {
      acc[dateKey] = 0;
    }
    
    acc[dateKey] += 1;
    
    return acc;
  }, {});
  
  // Sort dates and prepare data for response
  const sortedDates = Object.keys(usersByDate).sort();
  
  const labels: string[] = [];
  const data: number[] = [];
  const rows: (string | number)[][] = [];
  
  sortedDates.forEach(dateKey => {
    const count = usersByDate[dateKey];
    labels.push(format(new Date(dateKey), 'MMM dd'));
    data.push(count);
    rows.push([dateKey, count]);
  });
  
  // Add individual user details for the table view
  const userDetails = users.map(user => [
    user.id,
    user.email,
    `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Guest',
    format(user.createdAt, 'yyyy-MM-dd HH:mm')
  ]);
  
  return {
    labels,
    data,
    columns: ['Date', 'New Registrations'],
    rows,
    userDetails,
    userColumns: ['User ID', 'Email', 'Name', 'Registration Date'],
    dateRange: { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
  };
}

async function generateSupportReport(startDate: string | undefined, endDate: string | undefined): Promise<any> {
  const start = startDate ? parseISO(String(startDate)) : subDays(new Date(), 30);
  const end = endDate ? parseISO(String(endDate)) : new Date();
  
  // Get support tickets within date range
  const tickets = await prisma.supportTicket.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end
      }
    },
    include: {
      messages: true
    }
  });
  
  // Group tickets by status and extract categories
  const ticketsByStatus: Record<string, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0
  };
  
  const ticketsByDate: Record<string, number> = {};
  
  // Save all categories found (first message usually contains the category)
  const categories = new Set<string>();
  const categoryCounts: Record<string, number> = {};
  
  tickets.forEach(ticket => {
    // Count by status
    const status = ticket.status.toString();
    ticketsByStatus[status] = (ticketsByStatus[status] || 0) + 1;
    
    // Count by date
    const dateKey = format(ticket.createdAt, 'yyyy-MM-dd');
    ticketsByDate[dateKey] = (ticketsByDate[dateKey] || 0) + 1;
    
    // Extract category from first message if it exists
    const firstMessage = ticket.messages[0];
    if (firstMessage) {
      let category = 'other';
      
      // Try to identify category from the message content or use another field
      if (ticket.messages.some(m => m.message.toLowerCase().includes('order'))) {
        category = 'order_issue';
      } else if (ticket.messages.some(m => m.message.toLowerCase().includes('shipping'))) {
        category = 'shipping';
      } else if (ticket.messages.some(m => m.message.toLowerCase().includes('return'))) {
        category = 'return_refund';
      } else if (ticket.messages.some(m => m.message.toLowerCase().includes('product'))) {
        category = 'product_question';
      }
      
      categories.add(category);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });
  
  // Prepare status data
  const statusLabels = Object.keys(ticketsByStatus);
  const statusData = statusLabels.map(status => ticketsByStatus[status]);
  
  // Prepare category data
  const categoryLabels = Array.from(categories);
  const categoryData = categoryLabels.map(category => categoryCounts[category] || 0);
  
  // Prepare date-based data
  const sortedDates = Object.keys(ticketsByDate).sort();
  const dateLabels = sortedDates.map(date => format(new Date(date), 'MMM dd'));
  const dateData = sortedDates.map(date => ticketsByDate[date]);
  
  // Prepare ticket details for table
  const ticketDetails = tickets.map(ticket => [
    ticket.id,
    ticket.subject,
    ticket.status,
    format(ticket.createdAt, 'yyyy-MM-dd HH:mm'),
    ticket.orderId || 'N/A'
  ]);
  
  return {
    statusLabels,
    statusData,
    categoryLabels,
    categoryData,
    dateLabels,
    dateData,
    ticketColumns: ['ID', 'Subject', 'Status', 'Created At', 'Order ID'],
    ticketDetails,
    dateRange: { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
  };
}

// Sales Report
router.get('/sales', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const reportData = await generateSalesReport(
      req.query.startDate as string | undefined, 
      req.query.endDate as string | undefined
    );
    res.json(reportData);
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ message: 'Error generating sales report' });
  }
});

// Product Performance Report
router.get('/products', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const reportData = await generateProductsReport(
      req.query.startDate as string | undefined, 
      req.query.endDate as string | undefined
    );
    res.json(reportData);
  } catch (error) {
    console.error('Error generating product report:', error);
    res.status(500).json({ message: 'Error generating product report' });
  }
});

// Customer Report
router.get('/customers', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const reportData = await generateCustomersReport(
      req.query.startDate as string | undefined, 
      req.query.endDate as string | undefined
    );
    res.json(reportData);
  } catch (error) {
    console.error('Error generating customer report:', error);
    res.status(500).json({ message: 'Error generating customer report' });
  }
});

// Support Ticket Report
router.get('/support', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const reportData = await generateSupportReport(
      req.query.startDate as string | undefined, 
      req.query.endDate as string | undefined
    );
    res.json(reportData);
  } catch (error) {
    console.error('Error generating support ticket report:', error);
    res.status(500).json({ message: 'Error generating support ticket report' });
  }
});

// Export route that uses actual data from reports
router.get('/:reportType/export', verifyToken, isAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reportType } = req.params;
    const { format: exportFormat, startDate, endDate } = req.query;
    
    // First, get the report data by reusing the report endpoints
    let reportData: ReportData | undefined;
    
    // Create a mock request object to pass to the report handler
    const mockReq: any = {
      query: { startDate, endDate },
      user: (req as any).user
    };
    
    // Create a mock response to capture the report data
    const mockRes: any = {
      json: (data: any) => {
        reportData = data;
      }
    };
    
    // Call the appropriate report handler based on reportType
    switch (reportType) {
      case 'sales':
        const salesHandler = router.stack.find(r => r.route?.path === '/sales')?.route?.stack[2]?.handle;
        if (!salesHandler) {
          res.status(500).json({ message: 'Report handler not found' });
          return;
        }
        await salesHandler(mockReq, mockRes, () => {});
        break;
      case 'products':
        const productsHandler = router.stack.find(r => r.route?.path === '/products')?.route?.stack[2]?.handle;
        if (!productsHandler) {
          res.status(500).json({ message: 'Report handler not found' });
          return;
        }
        await productsHandler(mockReq, mockRes, () => {});
        break;
      case 'customers':
        const customersHandler = router.stack.find(r => r.route?.path === '/customers')?.route?.stack[2]?.handle;
        if (!customersHandler) {
          res.status(500).json({ message: 'Report handler not found' });
          return;
        }
        await customersHandler(mockReq, mockRes, () => {});
        break;
      case 'support':
        const supportHandler = router.stack.find(r => r.route?.path === '/support')?.route?.stack[2]?.handle;
        if (!supportHandler) {
          res.status(500).json({ message: 'Report handler not found' });
          return;
        }
        await supportHandler(mockReq, mockRes, () => {});
        break;
      default:
        res.status(400).json({ message: 'Invalid report type' });
        return;
    }
    
    if (!reportData) {
      res.status(500).json({ message: 'Failed to generate report data' });
      return;
    }
    
    // Now export the data in the requested format
    switch (exportFormat) {
      case 'csv':
        // Generate CSV using the actual report data
        const csvStringifier = createObjectCsvStringifier({
          header: reportData.columns.map(col => ({ id: col, title: col }))
        });
        
        const records = reportData.rows.map(row => {
          const record: Record<string, any> = {};
          row.forEach((cell, i) => {
            // We've already checked that reportData is not undefined
            record[reportData!.columns[i]] = cell;
          });
          return record;
        });
        
        const csvData = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.csv`);
        res.send(csvData);
        return;
      
      case 'pdf':
        // Generate PDF using the actual report data
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.pdf`);
        
        doc.pipe(res);
        
        // Add content to PDF
        doc.fontSize(20).text(`${reportType.toUpperCase()} Report`, { align: 'center' });
        doc.fontSize(12).text(`Date Range: ${reportData.dateRange.start} to ${reportData.dateRange.end}`, { align: 'center' });
        doc.moveDown(2);
        
        // Create table
        const tableTop = 150;
        let tableRow = tableTop;
        
        // Determine column widths based on content
        const columnWidth = 450 / reportData.columns.length;
        
        // Headers
        reportData.columns.forEach((col, i) => {
          doc.font('Helvetica-Bold').fontSize(10)
            .text(col, 72 + i * columnWidth, tableRow, { width: columnWidth, align: 'left' });
        });
        
        // Add a line after headers
        tableRow += 20;
        doc.moveTo(72, tableRow - 5)
           .lineTo(72 + columnWidth * (reportData as ReportData).columns.length, tableRow - 5)
           .stroke();
        
        // Data rows (limit to first 50 for PDF readability)
        const pdfRows = reportData.rows.slice(0, 50);
        pdfRows.forEach(row => {
          row.forEach((cell, i) => {
            doc.font('Helvetica').fontSize(10)
              .text(String(cell), 72 + i * columnWidth, tableRow, { width: columnWidth, align: 'left' });
          });
          tableRow += 20;
          
          // Add a separator line if we have space
          if (tableRow < 700) {
            doc.moveTo(72, tableRow - 5)
               .lineTo(72 + columnWidth * (reportData as ReportData).columns.length, tableRow - 5)
               .stroke('#EEEEEE');
          }
        });
        
        // Add note if data was truncated
        if (reportData.rows.length > 50) {
          doc.moveDown();
          doc.font('Helvetica-Oblique').fontSize(10).text(`Note: Showing 50 of ${reportData.rows.length} records`, { align: 'center' });
        }
        
        doc.end();
        return;
      
      case 'xlsx':
        // Generate Excel using the actual report data
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet(`${reportType} Report`);
        
        // Add title
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `${reportType.toUpperCase()} Report`;
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center' };
        
        // Add date range
        worksheet.mergeCells('A2:E2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Date Range: ${reportData.dateRange.start} to ${reportData.dateRange.end}`;
        dateCell.font = { size: 12 };
        dateCell.alignment = { horizontal: 'center' };
        
        // Add headers at row 4
        const headerRow = worksheet.getRow(4);
        reportData.columns.forEach((header, i) => {
          headerRow.getCell(i + 1).value = header;
          headerRow.getCell(i + 1).font = { bold: true };
        });
        
        // Add data starting from row 5
        reportData.rows.forEach((row, rowIndex) => {
          const excelRow = worksheet.getRow(rowIndex + 5);
          row.forEach((cell, cellIndex) => {
            excelRow.getCell(cellIndex + 1).value = cell;
          });
        });
        
        // Auto-size columns
        worksheet.columns.forEach(column => {
          column.width = 15;
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
        return;
      
      default:
        res.status(400).json({ message: 'Unsupported export format' });
        return;
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ message: 'Error exporting report' });
  }
});

export default router;