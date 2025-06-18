import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// For testing purposes only
transporter.verify((error, success) => {
  if (error) {
    console.error('Email verification error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Define interfaces
interface ShippingNotificationData {
  orderId: string;
  customerName: string;
  trackingNumber: string;
  orderTotal: number;
  orderDate: Date;
  shippingAddress: any;
}

// Update the OrderConfirmationData interface to handle both naming conventions
export interface OrderConfirmationData {
  email: string;
  // Make firstName and lastName optional
  firstName?: string;
  lastName?: string;
  phone?: string;    // Add phone number field
  userId?: string;   // Add user ID for reference
  orderId: string;
  // Make it accept either total or orderTotal
  orderTotal?: number;
  total?: number; // Add this as an alternative
  subtotal?: number;
  tax?: number;
  shipping?: number;
  items: {
    productName: string;
    quantity: number;
    price: number;
    size?: string | null;
  }[];
  shippingAddress?: {
    fullName: string;
    street: string;
    address1?: string; // Add address1 as optional property
    city: string;
    state: string;
    zipCode: string;
    postalCode?: string; // Add postalCode as optional property
    country: string;
  };
  billingAddress?: {  // Add billing address
    fullName: string;
    street?: string;
    address1?: string;
    city: string;
    state: string;
    zipCode?: string;
    postalCode?: string;
    country: string;
  };
  orderDate?: Date;   // Add order date
}

/**
 * Sends a shipping notification email to a customer
 */
export const sendShippingNotificationEmail = async (
  email: string, 
  data: ShippingNotificationData
) => {
  const { orderId, customerName, trackingNumber, orderTotal, orderDate, shippingAddress } = data;
  
  // Format address for display
  const formattedAddress = shippingAddress ? 
    `${shippingAddress.fullName || ''}\n${shippingAddress.address1 || ''}\n` +
    `${shippingAddress.address2 ? shippingAddress.address2 + '\n' : ''}` +
    `${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.postalCode || ''}\n` +
    `${shippingAddress.country || ''}` : 'Not provided';
  
  const subject = `Your Order #${orderId.substring(0, 8)} Has Shipped!`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568; text-align: center; padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
        Your Order Has Been Shipped!
      </h2>
      
      <div style="padding: 20px; background-color: #f9fafb;">
        <p style="margin-bottom: 15px;">Hello ${customerName},</p>
        
        <p style="margin-bottom: 15px;">
          Great news! Your order <strong>#${orderId.substring(0, 8)}</strong> placed on 
          ${new Date(orderDate).toLocaleDateString()} has been shipped and is on its way to you.
        </p>
        
        <div style="background-color: #ebf8ff; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2b6cb0;">Tracking Information</h3>
          <p style="margin-bottom: 5px;">
            <strong>Tracking Number:</strong> ${trackingNumber}
          </p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #4a5568;">Shipping Address</h3>
          <p style="white-space: pre-line;">${formattedAddress}</p>
        </div>
        
        <p style="margin-bottom: 15px;">
          Your order total: <strong>$${Number(orderTotal).toFixed(2)}</strong>
        </p>
        
        <p style="margin: 30px 0 15px 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderId}" 
             style="background-color: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Order Details
          </a>
        </p>
        
        <p style="margin-top: 30px; color: #718096; font-style: italic;">
          Thank you for shopping with us!
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; background-color: #2d3748; color: white;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Kaiyanami. All rights reserved.</p>
      </div>
    </div>
  `;
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Kaiyanami Store" <no-reply@kaiyanami.com>',
      to: email,
      subject,
      html: htmlContent
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Shipping notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending shipping notification email:', error);
    return false;
  }
};

// Format currency
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Sends an order confirmation email to a customer
 */
export async function sendOrderConfirmation(data: OrderConfirmationData): Promise<void> {
  const firstName = data.firstName || data.shippingAddress?.fullName?.split(' ')[0] || 'Customer';
  const lastName = data.lastName || (data.shippingAddress?.fullName?.split(' ').slice(1).join(' ')) || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const orderDate = data.orderDate ? new Date(data.orderDate) : new Date();

  try {
    console.log("Attempting to send email with data:", {
      orderId: data.orderId,
      email: data.email || '(missing)',
      itemCount: data.items?.length || 0
    });
    
    // More thorough email validation
    if (!data.email || data.email === 'undefined' || data.email === 'null') {
      console.error(`Missing email address for order confirmation: ${data.orderId}`);
      return;
    }

    // Create HTML for order items
    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const totalAmount = data.orderTotal ?? data.total ?? 0;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2d3748; padding: 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">Order Confirmation</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px;">Hello <strong>${fullName}</strong>,</p>
          <p style="margin-bottom: 20px;">Thank you for your order! We're excited to get your items to you as soon as possible.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <h2 style="margin-top: 0; color: #4a5568;">Order #${data.orderId.substring(0, 8)}</h2>
            <p style="margin: 0; color: #718096;">Placed on: ${orderDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right; border-top: 1px solid #eee;">Subtotal:</td>
                <td style="padding: 10px; text-align: right; border-top: 1px solid #eee;">${formatCurrency(data.subtotal ?? 0)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right;">Tax:</td>
                <td style="padding: 10px; text-align: right;">${formatCurrency(data.tax ?? 0)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right;">Shipping:</td>
                <td style="padding: 10px; text-align: right;">${formatCurrency(data.shipping ?? 0)}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td colspan="2" style="padding: 10px; text-align: right; border-top: 1px solid #eee;">Total:</td>
                <td style="padding: 10px; text-align: right; border-top: 1px solid #eee;">${formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 20px;">
            ${data.shippingAddress ? `
              <div style="flex: 1; min-width: 250px; margin-right: 20px; margin-bottom: 20px;">
                <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Shipping Information</h3>
                <p style="margin-top: 0;">
                  <strong>${data.shippingAddress.fullName}</strong><br>
                  ${data.shippingAddress.street || data.shippingAddress.address1}<br>
                  ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zipCode || data.shippingAddress.postalCode}<br>
                  ${data.shippingAddress.country}
                </p>
              </div>
            ` : ''}
            
            ${data.billingAddress ? `
              <div style="flex: 1; min-width: 250px; margin-bottom: 20px;">
                <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Billing Information</h3>
                <p style="margin-top: 0;">
                  <strong>${data.billingAddress.fullName}</strong><br>
                  ${data.billingAddress.street || data.billingAddress.address1 || ''}<br>
                  ${data.billingAddress.city}, ${data.billingAddress.state} ${data.billingAddress.zipCode || data.billingAddress.postalCode}<br>
                  ${data.billingAddress.country}
                </p>
              </div>
            ` : ''}
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="color: #4a5568; margin-top: 0;">Customer Information</h3>
            <p style="margin: 0;">
              <strong>Name:</strong> ${fullName}<br>
              <strong>Email:</strong> ${data.email}<br>
              ${data.phone ? `<strong>Phone:</strong> ${data.phone}<br>` : ''}
              <strong>Customer ID:</strong> ${data.userId || 'Guest'}<br>
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${data.orderId}" 
               style="background-color: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Order Details
            </a>
          </div>
          
          <p style="margin-top: 30px; color: #718096;">
            If you have any questions about your order, please contact our customer support team at 
            <a href="mailto:support@kaiyanami.com" style="color: #4299e1; text-decoration: none;">support@kaiyanami.com</a>.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; background-color: #2d3748; color: white;">
          <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Kaiyanami. All rights reserved.</p>
          <p style="margin: 0; font-size: 12px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/privacy" style="color: #a0aec0; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/terms" style="color: #a0aec0; text-decoration: none; margin: 0 10px;">Terms of Service</a>
          </p>
        </div>
      </div>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Kaiyanami Shop" <noreply@kaiyanami.com>',
      to: data.email,
      subject: `Order Confirmation #${data.orderId.substring(0, 8)}`,
      html: emailHtml
    });

    // Log success with more details
    console.log(`Email sent successfully to ${data.email} for order ${data.orderId}`);
  } catch (error) {
    console.error(`Error sending confirmation email for order ${data.orderId}:`, error);
  }
}

/**
 * General purpose email sending function
 */
export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string; // Add optional from property
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    console.log(`Sending email to: ${options.to}`);
    
    const info = await transporter.sendMail({
      from: options.from || process.env.EMAIL_FROM || '"Kaiyanami Shop" <noreply@kaiyanami.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });

    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Update the default export to include the new function
export default {
  sendShippingNotificationEmail,
  sendOrderConfirmation,
  sendEmail  // Add this line
};
