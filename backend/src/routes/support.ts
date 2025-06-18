import { Router } from "express";
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// Add these new imports
import nodemailer from 'nodemailer';


const prisma = new PrismaClient();
const router = Router();

// Add email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Helper to handle async route functions
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Configure file upload with multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/tickets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only .jpeg, .jpg, .png, .gif and .pdf format allowed!'));
    }
  }
});

// Update the POST route handler to validate and handle the orderId properly

router.post('/', verifyToken, async (req: any, res: any) => {
  try {
    const { subject, message, priority, orderId } = req.body;
    const userId = req.user?.id;
    
    console.log('Creating support ticket with order:', { 
      subject, 
      hasOrderId: !!orderId,
      orderIdValue: orderId 
    });
    
    // Create ticket data object
    const ticketData: any = {
      subject,
      description: message,
      priority: priority || 'HIGH',
      status: 'OPEN',
      userId,
      messages: {
        create: {
          message,
          fromUser: true
        }
      }
    };
    
    // Add orderId if provided
    if (orderId && orderId !== '') {
      ticketData.orderId = orderId;
      
      // Debug logging
      console.log('Adding order relationship:', orderId);
    }
    
    const ticket = await prisma.supportTicket.create({
      data: ticketData,
      include: {
        messages: true,
        order: true
      }
    });
    
    // Verify the order was linked
    console.log('Ticket created with order:', {
      ticketId: ticket.id,
      hasOrder: !!ticket.order,
      orderId: ticket.orderId
    });
    
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ message: 'Failed to create support ticket' });
  }
});

// Add this route for guest tickets
router.post('/guest', asyncHandler(async (req: any, res: any) => {
  const { subject, description, orderId, priority, guestEmail, guestName } = req.body;
  
  // Validate required fields
  if (!subject || !description || !guestEmail) {
    return res.status(400).json({ message: 'Subject, description, and email are required for guest tickets' });
  }
  
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        description,
        orderId,
        priority: priority || 'MEDIUM',
        guestEmail,
        guestName,
        messages: {
          create: {
            message: description,
            fromUser: true
          }
        }
      }
    });
    
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating guest ticket:', error);
    res.status(500).json({ message: 'Failed to create support ticket', error: (error as Error).message });
  }
}));

// Get tickets for logged in user
router.get('/my-tickets', verifyToken, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      order: true,
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  
  res.json(tickets);
}));

// Get ticket by ID (requires authentication)
router.get('/:id', verifyToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching ticket:', id);
    
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true
                  }
                }
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        attachments: true
      }
    });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Debug: Log the order relationship
    console.log('Ticket order relationship:', {
      hasOrder: !!ticket.order,
      orderId: ticket.orderId
    });
    
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({ message: 'Failed to fetch ticket details' });
  }
});

// Add a message to a ticket
router.post('/:id/messages', verifyToken, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!message) {
    return res.status(400).json({ message: 'Message content is required' });
  }
  
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });
  
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }
  
  // Check if user has access to this ticket
  if (!isAdmin && ticket.userId !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  // Create the message
  const ticketMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      message,
      fromUser: !isAdmin,
      staffId: isAdmin ? userId : undefined,
      staffName: isAdmin ? req.user?.name || req.user?.email : undefined
    }
  });
  
  // If admin is replying, update ticket status to IN_PROGRESS
  if (isAdmin && ticket.status === 'OPEN') {
    await prisma.supportTicket.update({
      where: { id },
      data: { status: 'IN_PROGRESS' }
    });
  }
  
  // ADDED: Send email notification when admin responds
  if (isAdmin) {
    try {
      // For registered users
      if (ticket.userId && ticket.user?.email) {
        const userEmail = ticket.user.email;
        const userName = ticket.user.firstName || 'Customer';
        
        await transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME || 'Kaiyanami Support'}" <${process.env.EMAIL_FROM || 'support@kaiyanami.com'}>`,
          to: userEmail,
          subject: `Update on your ticket: ${ticket.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your support ticket has been updated</h2>
              <p>Hello ${userName},</p>
              <p>Your support ticket <strong>#${id.substring(0, 8)}</strong> has received a new response:</p>
              <div style="padding: 15px; background-color: #f5f5f5; border-left: 4px solid #3498db; margin: 15px 0;">
                ${message}
              </div>
              <p>Current status: <strong>${ticket.status}</strong></p>
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/${id}" 
                style="background-color: #3498db; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
                View Ticket
              </a></p>
              <p>Thank you for your patience.</p>
              <p>Best regards,<br>Kaiyanami Support Team</p>
            </div>
          `
        });
        console.log(`Email notification sent to ${userEmail} for ticket ${id}`);
      }
      // For guest tickets
      else if (ticket.guestEmail) {
        const guestEmail = ticket.guestEmail;
        const guestName = ticket.guestName || 'Customer';
        
        await transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME || 'Kaiyanami Support'}" <${process.env.EMAIL_FROM || 'support@kaiyanami.com'}>`,
          to: guestEmail,
          subject: `Update on your ticket: ${ticket.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your support ticket has been updated</h2>
              <p>Hello ${guestName},</p>
              <p>Your support ticket <strong>#${id.substring(0, 8)}</strong> has received a new response:</p>
              <div style="padding: 15px; background-color: #f5f5f5; border-left: 4px solid #3498db; margin: 15px 0;">
                ${message}
              </div>
              <p>Current status: <strong>${ticket.status}</strong></p>
              <p>To respond, please reply directly to this email or visit our support portal.</p>
              <p>Thank you for your patience.</p>
              <p>Best regards,<br>Kaiyanami Support Team</p>
            </div>
          `
        });
        console.log(`Email notification sent to guest ${guestEmail} for ticket ${id}`);
      }
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Failed to send email notification:', emailError);
    }
  }
  
  res.status(201).json(ticketMessage);
}));

// Upload attachment to a ticket
router.post('/:id/attachments', verifyToken, upload.single('file'), asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  const file = req.file;
  
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const ticket = await prisma.supportTicket.findUnique({
    where: { id }
  });
  
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }
  
  // Check if user has access to this ticket
  if (!isAdmin && ticket.userId !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  // Create the attachment record
  const attachment = await prisma.ticketAttachment.create({
    data: {
      ticketId: id,
      fileName: file.originalname,
      fileUrl: `/uploads/tickets/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype
    }
  });
  
  res.status(201).json(attachment);
}));

// Update ticket status (admin only)
router.patch('/:id/status', verifyToken, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      message: 'Invalid status',
      validOptions: validStatuses
    });
  }
  
  const updatedTicket = await prisma.supportTicket.update({
    where: { id },
    data: { status }
  });
  
  res.json(updatedTicket);
}));

// Get all tickets (admin only)
router.get('/', verifyToken, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      },
      order: true,
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { messages: true }
      }
    }
  });
  
  res.json(tickets);
}));

// FAQ endpoints
router.get('/faq/categories', asyncHandler(async (req: any, res: any) => {
  const categories = await prisma.fAQ.groupBy({
    by: ['category'],
    where: { isActive: true }
  });
  
  res.json(categories.map(c => c.category));
}));

router.get('/faq/:category', asyncHandler(async (req: any, res: any) => {
  const { category } = req.params;
  
  const faqs = await prisma.fAQ.findMany({
    where: {
      category,
      isActive: true
    },
    orderBy: { order: 'asc' }
  });
  
  res.json(faqs);
}));

// Create/update FAQ (admin only)
router.post('/faq', verifyToken, asyncHandler(async (req: any, res: any) => {
  const { id, question, answer, category, order, isActive } = req.body;
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  
  if (!userId || !isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  if (!question || !answer || !category) {
    return res.status(400).json({ message: 'Question, answer, and category are required' });
  }
  
  let faq;
  if (id) {
    // Update existing FAQ
    faq = await prisma.fAQ.update({
      where: { id },
      data: { question, answer, category, order, isActive }
    });
  } else {
    // Create new FAQ
    faq = await prisma.fAQ.create({
      data: { question, answer, category, order, isActive }
    });
  }
  
  res.status(201).json(faq);
}));

router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});

export default router;