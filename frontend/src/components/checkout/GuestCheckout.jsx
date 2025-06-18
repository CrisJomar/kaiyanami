import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useShopContext } from '../../context/ShopContext';
import OrderSummary from './OrderSummary';
import AddressForm from './AddressForm';
import { toast } from 'react-toastify';
import StripeProvider from './StripeProvider'; 
import PaymentForm from './PaymentForm';

const GuestCheckout = () => {
  const { cart, clearCart } = useShopContext();
  const [guestInfo, setGuestInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  });
  
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  
  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = parseFloat((subtotal * 0.0115).toFixed(2));
  const shipping = subtotal > 75 ? 0 : 10;
  const total = subtotal + tax + shipping;
  
  const navigate = useNavigate();
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGuestInfo(prev => ({ ...prev, [name]: value }));
  };
  
  const validateForm = () => {
    const requiredFields = ['email', 'firstName', 'lastName', 'address1', 'city', 'state', 'postalCode'];
    
    for (const field of requiredFields) {
      if (!guestInfo[field]) {
        toast.error(`Please fill in your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(guestInfo.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  // Add a server connection check function
  const checkServerConnection = async () => {
    try {
      await axios.get('http://localhost:5001/api/health', { timeout: 3000 });
      return true;
    } catch (error) {
      console.error("Backend server connection failed:", error);
      toast.error("Cannot connect to server. Please try again later.");
      return false;
    }
  };
  
  const handlePlaceOrder = async (paymentIntentId) => {

    const isServerConnected = await checkServerConnection();
    if (!isServerConnected) {
      setPaymentProcessing(false);
      return;
    }

    console.log("Starting handlePlaceOrder with:", paymentIntentId);
    
    
    if (!guestInfo.email || !guestInfo.firstName || !guestInfo.lastName) {
      toast.error("Please fill all required customer information fields");
      return;
    }
  
    try {
     
      setPaymentProcessing(true);
      
      if (!paymentIntentId) {
        toast.error("Payment information is missing");
        setPaymentProcessing(false);
        return;
      }
      
      
      const requestPayload = {
       
        paymentIntentId: paymentIntentId,
        
        
        cartItems: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          size: item.size || null
        })),
        
        
        customer: {
          email: guestInfo.email,
          firstName: guestInfo.firstName,
          lastName: guestInfo.lastName,
          phone: guestInfo.phoneNumber || ""
        },
        
        // Shipping address
        shippingAddress: {
          street: guestInfo.address1,
          city: guestInfo.city,
          state: guestInfo.state,
          zipCode: guestInfo.postalCode,
          country: guestInfo.country || 'US'
        },
        
        // Totals
        orderTotal: {
          subtotal,
          tax,
          shipping,
          total
        }
      };
  
      console.log("Sending order request with payload:", JSON.stringify(requestPayload, null, 2));
      
      // BEFORE making the request
      console.log("API endpoint:", 'http://localhost:5001/api/payment/create-order');
      console.log("Checking API health before order request...");
  
      try {
        // First, check if API is responsive at all with a health check
        const healthCheck = await axios.get(
          'http://localhost:5001/api/health', 
          { timeout: 5000 }
        ).catch(err => {
          console.log("API health check failed:", err.message);
          return { status: 500 };
        });
        
        console.log("API health check:", healthCheck.status);
        
        if (healthCheck.status !== 200) {
          throw new Error("API server is not responding properly");
        }
        
        // Then proceed with the order request
        const orderResponse = await axios.post(
          'http://localhost:5001/api/payment/create-order', 
          requestPayload,
          { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000 
          }
        );
        
        console.log("Order API response received:", orderResponse.data);
        
        
        sessionStorage.setItem('checkoutEmail', guestInfo.email);
        
        
        toast.success("Order placed successfully!");
        clearCart();
        
       
        setPaymentProcessing(false);
        
        
        console.log("Full order response:", orderResponse?.data);
        
        const orderId = 
          orderResponse?.data?.orderId || 
          orderResponse?.data?.order?.id;
        
        if (orderId) {
          console.log("Redirecting to order confirmation with ID:", orderId);
          navigate(`/order-confirmation/${orderId}`);
        } else {
          console.error("Missing orderId in response:", orderResponse?.data);
          toast.warning("Order created but confirmation details are missing.");
          navigate('/');
        }
      } catch (error) {
      
        if (error.code === 'ECONNABORTED') {
          console.error('Request timed out. Backend server may be overloaded or stuck.');
          toast.error('Request timed out. Please try again or contact support.');
        }
        
        console.error('Error placing order:', error);
        console.log("Complete error details:", error.response?.data || error.message);
        
        // More specific error messaging
        if (error.response) {
          toast.error(`Order failed: ${error.response.data.message || error.response.data.error || 'Server error'}`);
        } else if (error.request) {
          // Request was made but no response
          toast.error('No response from server. Please check your connection and try again.');
        } else {
          toast.error(`Error: ${error.message || 'Failed to place your order'}`);
        }
        
        // ALWAYS reset processing state on error
        setPaymentProcessing(false);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      console.log("Complete error details:", error.response?.data || error.message);
      
      // More specific error messaging
      if (error.response) {
        toast.error(`Order failed: ${error.response.data.message || error.response.data.error || 'Server error'}`);
      } else if (error.request) {
        // Request was made but no response
        toast.error('No response from server. Please check your connection and try again.');
      } else {
        toast.error(`Error: ${error.message || 'Failed to place your order'}`);
      }
      
      // ALWAYS reset processing state on error
      setPaymentProcessing(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Guest Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="mb-4">
              <label className="block text-gray-700">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                name="email"
                value={guestInfo.email}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
                placeholder="you@example.com"
              />
              <p className="mt-1 text-sm text-gray-500">Your order confirmation will be sent here</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-gray-700">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="firstName"
                  value={guestInfo.firstName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="lastName"
                  value={guestInfo.lastName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={guestInfo.phoneNumber}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Optional"
              />
            </div>
          </div>
          
          {/* Shipping Address */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
            <AddressForm 
              addressData={guestInfo}
              setAddressData={setGuestInfo}
            />
          </div>
          
          {/* Payment Section */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
            <StripeProvider>
              <PaymentForm 
                onSubmit={handlePlaceOrder}
                isProcessing={paymentProcessing}
                amount={total}
                email={guestInfo.email}
              />
            </StripeProvider>
          </div>
        </div>
        
        {/* Order Summary */}
        <div>
          <OrderSummary 
            cart={cart} 
            subtotal={subtotal} 
            shipping={shipping} 
            tax={tax}
            shippingAddress={{
              fullName: `${guestInfo.firstName} ${guestInfo.lastName}`,
              address1: guestInfo.address1,
              address2: guestInfo.address2,
              city: guestInfo.city,
              state: guestInfo.state,
              postalCode: guestInfo.postalCode,
              country: guestInfo.country
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default GuestCheckout;