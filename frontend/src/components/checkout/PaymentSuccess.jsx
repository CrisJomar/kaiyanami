import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

// This component will run when payment is successful, before navigating to order confirmation
const PaymentSuccess = ({ orderId, items, customerInfo, clearCart }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // This function runs once immediately when this component mounts
    const saveDataAndSendEmail = async () => {
      try {
        // Format the items
        const formattedItems = items.map(item => ({
          id: item.id,
          name: item.name || 'Product',
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          size: item.selectedSize || item.size || '',
          image: item.image || item.imageUrl || ''
        }));
        
        // Calculate totals
        const subtotal = formattedItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0);
        const shipping = subtotal >= 100 ? 0 : 10;
        const tax = subtotal * 0.115;
        const total = subtotal + shipping + tax;
        
        console.log('SUCCESS COMPONENT: Sending email directly with items:', formattedItems);
        
       
        await axios.post('http://localhost:5001/api/email/send-confirmation', {
          orderId,
          email: customerInfo?.email || 'crisjhernandez15@gmail.com',
          items: formattedItems,
          subtotal,
          shipping,
          tax,
          total
        });
        
        console.log('SUCCESS COMPONENT: Email sent successfully before navigation');
        toast.success('Order confirmation email sent!');
        
        // NOW navigate to the confirmation page
        navigate(`/order-confirmation/${orderId}`, {
          state: {
            orderItems: formattedItems,
            email: customerInfo?.email,
            emailSent: true
          }
        });
        
        // Clear cart only after everything else is done
        setTimeout(() => clearCart(), 500);
        
      } catch (error) {
        console.error('ERROR in success component:', error);
        toast.error('An error occurred, but your order was processed');
        navigate(`/order-confirmation/${orderId}`);
      }
    };
    
    saveDataAndSendEmail();
  }, [orderId, items, customerInfo, navigate, clearCart]);
  
  // Simple loading screen while sending email and preparing navigation
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-green-600">Payment Successful!</h2>
        <p className="mb-4">Your order has been processed.</p>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mr-3"></div>
          <p>Sending confirmation email and finalizing your order...</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;