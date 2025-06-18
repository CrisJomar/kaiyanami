import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailController = {
  sendConfirmation: async (req: Request, res: Response) => {
    try {
      console.log("Email confirmation request received:", req.body);
      const { orderId, email, items, total, subtotal, tax, shipping } = req.body;
      
      if (!email) {
        console.error("No email address provided in request");
        return res.status(400).json({ message: 'Email address is required' });
      }
      
      console.log("Will send confirmation email TO:", email);
      console.log("Using sender account:", process.env.EMAIL_USER);
      
      // Create transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      console.log("Using email credentials:", process.env.EMAIL_USER);
      
      // Format items safely
      const orderItems = items && Array.isArray(items) ? items.map(item => ({
        name: item.name || 'Product',
        quantity: parseInt(String(item.quantity)) || 1,
        price: parseFloat(String(item.price)) || 0,
        total: (parseFloat(String(item.price)) || 0) * (parseInt(String(item.quantity)) || 1),
        size: item.selectedSize || item.size || ''
      })) : [];
      
      // Calculate totals - use provided values or calculate from items
      const calculatedSubtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
      const finalSubtotal = subtotal || calculatedSubtotal || 0;
      const finalShipping = shipping !== undefined ? shipping : (finalSubtotal >= 100 ? 0 : 10);
      const finalTax = tax !== undefined ? tax : (finalSubtotal * 0.115);
      const finalTotal = total || (finalSubtotal + finalShipping + finalTax);
      
      // Log the values
      console.log("Email order summary:", {
        subtotal: finalSubtotal,
        shipping: finalShipping,
        tax: finalTax,
        total: finalTotal,
        itemCount: orderItems.length
      });
      
      // Create HTML email template
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f4f4f4; text-align: left; padding: 10px; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .totals td { border: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Thank you for your order! We're processing it now and will ship it soon.</p>
              
              <h2>Order Details</h2>
              <p><strong>Order Number:</strong> ${orderId || 'N/A'}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              
              <table>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
                ${orderItems.length > 0 ? orderItems.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td>$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="4" style="text-align: center;">No items in order</td>
                  </tr>
                `}
                <tr class="totals">
                  <td colspan="3" align="right"><strong>Subtotal:</strong></td>
                  <td>$${finalSubtotal.toFixed(2)}</td>
                </tr>
                <tr class="totals">
                  <td colspan="3" align="right"><strong>Shipping:</strong></td>
                  <td>${finalShipping === 0 ? 'Free' : '$' + finalShipping.toFixed(2)}</td>
                </tr>
                <tr class="totals">
                  <td colspan="3" align="right"><strong>Tax:</strong></td>
                  <td>$${finalTax.toFixed(2)}</td>
                </tr>
                <tr class="totals">
                  <td colspan="3" align="right"><strong>Total:</strong></td>
                  <td><strong>$${finalTotal.toFixed(2)}</strong></td>
                </tr>
              </table>
              
              <p>If you have any questions about your order, please contact our customer service.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Kaiyanami. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      console.log("Attempting to send email to:", email);
      
      // Send email
      const info = await transporter.sendMail({
        from: `"Kaiyanami Shop" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Order Confirmation #${orderId || 'New Order'}`,
        html: htmlContent
      });
      
      console.log('Email sent successfully:', info.messageId);
      
      res.status(200).json({
        message: 'Order confirmation email sent successfully',
        emailId: info.messageId
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      res.status(500).json({
        message: 'Failed to send confirmation email',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Simple test endpoint
  test: async (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Email route is working',
      emailConfigured: !!process.env.EMAIL_USER
    });
  }
};

export default emailController;