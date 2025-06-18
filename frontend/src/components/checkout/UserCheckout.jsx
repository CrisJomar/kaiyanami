import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useShopContext } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import OrderSummary from './OrderSummary';
import AddressSelector from './AddressSelector';
import PaymentForm from './PaymentForm';
import StripeProvider from './StripeProvider';
import { toast } from 'react-toastify';


const UserCheckout = ({ user }) => {
  const { cart, clearCart } = useShopContext();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Initialize state with user data if available
  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    shippingMethod: 'standard'
  });

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    async function fetchUserProfile() {
      if (isAuthenticated) {
        try {
          const response = await axios.get('/api/users/profile');
          const { email, firstName, lastName, address } = response.data;

          setFormData({
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            address: address?.street || '',
            city: address?.city || '',
            state: address?.state || '',
            zipCode: address?.zipCode || '',
            country: address?.country || 'US'
          });
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    }

    fetchUserProfile();
  }, [isAuthenticated]);

  
  useEffect(() => {
    if (user?.email && formData.email !== user.email) {
      console.log("Updating email from user data:", user.email);
      setFormData(prev => ({
        ...prev,
        email: user.email
      }));
    }
  }, [user, formData.email]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = parseFloat((subtotal * 0.115).toFixed(2));
  const shipping = subtotal > 75 ? 0 : 10;
  const total = subtotal + tax + shipping;
  

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        try {
          // Try to fetch from actual endpoint
          const response = await axios.get('http://localhost:5001/api/addresses/saved', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSavedAddresses(response.data);
          
          // Auto-select default address if available
          const defaultAddress = response.data.find(addr => addr.isDefault);
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id);
          } else if (response.data.length > 0) {
            setSelectedAddressId(response.data[0].id);
          }
        } catch (apiError) {
          console.warn('API endpoint not available, using mock data');
          // Mock data for testing
          const mockAddresses = [
            {
              id: '1',
              fullName: 'John Doe',
              userId: 'user-id',
              address1: '123 Main St',
              address2: '',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'US',
              phoneNumber: '',
              isDefault: true
            }
          ];
          setSavedAddresses(mockAddresses);
          setSelectedAddressId('1');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching addresses', error);
        toast.error('Failed to load your saved addresses');
        setLoading(false);
      }
    };
    
    fetchAddresses();
  }, []);
  
  
  const handlePlaceOrderInternal = async (paymentMethodId) => {
    try {
      setIsSubmitting(true);
      
      
      const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
      
     
      const customerEmail = user?.email || formData.email || '';
      console.log("DEBUG - Using customer email:", customerEmail);
      
      
      if (!customerEmail || !customerEmail.includes('@')) {
        console.error("Missing or invalid email address");
        toast.error("Please provide a valid email address for order confirmation");
        setIsSubmitting(false);
        return;
      }
      
      
      const orderData = {
        customer: {
          email: customerEmail,  
          firstName: user?.firstName || 'Guest',
          lastName: user?.lastName || 'Customer',
        },
        shipping: {
          address: selectedAddress?.address1 || '',
          city: selectedAddress?.city || '',
          state: selectedAddress?.state || '',
          zipCode: selectedAddress?.postalCode || '',
          country: selectedAddress?.country || 'US',
        },
        payment: {
          method: 'stripe',
          paymentMethodId: paymentMethodId
        },
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          size: item.size
        })),
        email: customerEmail  
      };
      
      console.log("DEBUG - Sending order data:", JSON.stringify(orderData));
      
      
      const response = await axios.post('http://localhost:5001/api/orders/create-order', orderData);
      
   
      console.log("Server response:", response.data);
      
   
      if (response.data && response.data.orderId) {
        console.log("Order created successfully! ID:", response.data.orderId);
         
      
        clearCart();
        
        console.log("Navigating to:", `/order-confirmation/${response.data.orderId}`);
        navigate(`/order-confirmation/${response.data.orderId}`);
      } else {
        console.error("Invalid server response:", response.data);
        throw new Error("Server did not return an order ID");
      }
    } catch (error) {
      console.error("Error in handlePlaceOrderInternal:", error);
      console.error("Error response:", error.response?.data);
      toast.error("Failed to place your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="p-8 text-center">Loading your checkout information...</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address Selection */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
            
            {savedAddresses.length === 0 ? (
              <div className="text-amber-600 mb-4">
                No saved addresses found. Please add an address.
              </div>
            ) : (
              <AddressSelector 
                addresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={setSelectedAddressId}
              />
            )}
          </div>
          
          {/* Contact Information - Simplified */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="mb-4">
              <label className="block text-gray-700">Email <span className="text-red-500">*</span></label>
              {user ? (
                <div>
                  <div className="p-2 border rounded bg-gray-50 text-gray-700">
                    {user.email || "Loading email..."}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Your order confirmation will be sent to your account email
                  </p>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                    placeholder="you@example.com"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Your order confirmation will be sent here
                  </p>
                </>
              )}
            </div>
          </div>
          
          {/* Payment Section - Now with Stripe */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
            <StripeProvider>
              <PaymentForm 
                onSubmit={handlePlaceOrderInternal}
                isSubmitting={isSubmitting} // Changed from isProcessing to isSubmitting
                amount={total}
                email={formData.email || user?.email || ''}
              />
            </StripeProvider>
            
            {/* Email confirmation notice */}
            <div className="mt-4 text-sm text-gray-600">
              <p>A confirmation email will be sent to your account email address.</p>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div>
          <OrderSummary 
            cart={cart} 
            subtotal={subtotal} 
            shipping={shipping} 
            tax={tax}
            shippingAddress={savedAddresses.find(addr => addr.id === selectedAddressId)}
          />
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    console.log("DEBUG - Current user:", user);
    console.log("DEBUG - Current formData:", formData);
  }, [user, formData]);
};

export default UserCheckout;