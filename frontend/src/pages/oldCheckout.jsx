import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useShopContext } from '../context/ShopContext';
import CheckoutForm from '../components/checkout/CheckoutForm';
import PaymentSuccess from '../components/checkout/PaymentSuccess';
import OrderSummary from '../components/checkout/OrderSummary';

const Checkout = () => {
  const { cart, clearCart } = useShopContext();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({});
  const [shippingInfo, setShippingInfo] = useState({});
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isGuestCheckout, setIsGuestCheckout] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Assume you have a way to determine login status
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');

  // Define a local calculate function that doesn't modify cart
  const calculateCartTotal = () => {
    if (!cart || !Array.isArray(cart)) return 0;
    return cart.reduce((total, item) => {
      return total + (Number(item.price) * Number(item.quantity || 1));
    }, 0);
  };

  // Step navigation functions
  const handleNextStep = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handlePreviousStep = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  // First, check if the cart is valid when component mounts
  useEffect(() => {
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      console.log('Cart is empty, redirecting to cart page');
      toast.info('Your shopping cart is empty');
      navigate('/cart');
      return;
    }
    
    // Create a payment intent
    const createPaymentIntent = async () => {
      setLoading(true);
      try {
        // Format cart items properly with required fields
        const formattedItems = cart.map(item => ({
          id: item.id || `unknown-${Date.now()}`,
          price: String(parseFloat(item.price) || 0),
          quantity: parseInt(item.quantity) || 1
        }));
        
        const response = await axios.post('http://localhost:5001/payment/create-intent', {
          items: formattedItems
        });
        
        if (response.data && response.data.clientSecret) {
          console.log('Payment intent created successfully');
          setClientSecret(response.data.clientSecret);
        } else {
          throw new Error('Invalid response from payment server');
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
        setError('Could not initialize payment. Please try again.');
        toast.error('Failed to initialize payment system');
      } finally {
        setLoading(false);
      }
    };
    
    createPaymentIntent();
  }, [cart, navigate]);

  useEffect(() => {
    const fetchSavedAddresses = async () => {
      const token = localStorage.getItem('token');
      if (!token) return; // Not logged in, skip fetching addresses
      
      setLoadingAddresses(true);
      try {
        const response = await axios.get('http://localhost:5001/api/addresses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Fetched saved addresses:', response.data);
        setSavedAddresses(response.data || []);
        
        // Pre-select default address if available
        const defaultAddress = response.data?.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          // Pre-populate shipping info with the default address
          setShippingInfo({
            fullName: defaultAddress.fullName,
            address1: defaultAddress.address1,
            address2: defaultAddress.address2 || '',
            city: defaultAddress.city,
            state: defaultAddress.state,
            postalCode: defaultAddress.postalCode,
            country: defaultAddress.country,
            phoneNumber: defaultAddress.phoneNumber || ''
          });
        }
      } catch (error) {
        console.error('Error fetching saved addresses:', error);
      } finally {
        setLoadingAddresses(false);
      }
    };
    
    fetchSavedAddresses();
  }, []);

  useEffect(() => {
    // If user is logged in, always use their saved address and don't allow guest checkout
    if (isLoggedIn) {
      setIsGuestCheckout(false);
      
      // If they haven't selected an address but have saved addresses, pre-select one
      if (!selectedAddressId && savedAddresses.length > 0) {
        // Find default address or use the first one
        const defaultAddress = savedAddresses.find(addr => addr.isDefault) || savedAddresses[0];
        setSelectedAddressId(defaultAddress.id);
      }
    }
  }, [isLoggedIn, savedAddresses, selectedAddressId]);

  // Store order data for confirmation page
  const saveCheckoutData = (orderData, items, customerInfo) => {
    try {
      // Create a more complete order object
      const completeOrder = {
        ...orderData,
        items: items.map(item => ({
          id: item.id,
          name: item.name || 'Product',
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          size: item.selectedSize || item.size || '',
          imageUrl: item.image || item.imageUrl || ''
        })),
        customerInfo: customerInfo || {},
        subtotal: calculateCartTotal(),
        shipping: calculateCartTotal() >= 100 ? 0 : 10,
        tax: calculateCartTotal() * 0.07,
        total: calculateCartTotal() + (calculateCartTotal() >= 100 ? 0 : 10) + (calculateCartTotal() * 0.07),
        createdAt: new Date().toISOString()
      };
      
      // Save a flag to indicate we should send email automatically
      sessionStorage.setItem('sendEmailAutomatically', 'true');
      
      // Save customer email for easy access
      if (customerInfo?.email) {
        sessionStorage.setItem('checkoutEmail', customerInfo.email);
      }
      
      // Save complete order data
      localStorage.setItem(`order_${orderData.orderId}`, JSON.stringify(completeOrder));
      localStorage.setItem('lastOrder', JSON.stringify(completeOrder));
      
      // Save a backup of the cart items
      localStorage.setItem('lastOrderItems', JSON.stringify(items));
      
      console.log('Saved checkout data for confirmation page:', completeOrder);
    } catch (err) {
      console.error('Error saving checkout data:', err);
    }
  };

  // When payment is successful
  const handlePaymentSuccess = (orderResponse) => {
    try {
      // Get the order data
      const orderData = orderResponse.data || {};
      const orderId = orderData.orderId || orderData.id;
      
      // Save important data to session storage
      sessionStorage.setItem('sendEmailAutomatically', 'true');
      
      // Save cart items for email
      localStorage.setItem('lastOrderItems', JSON.stringify(cart));
      
      // Save the customer's email if available
      if (customerInfo?.email) {
        sessionStorage.setItem('checkoutEmail', customerInfo.email);
      }
      
      console.log('Payment successful, saved data for confirmation page');
      
      // Clear cart and redirect to order confirmation
      clearCart();
      navigate(`/order-confirmation/${orderId}`);
    } catch (err) {
      console.error('Error handling successful payment:', err);
      toast.error('Your payment was processed but we encountered an error');
    }
  };

  const handlePlaceOrder = async () => {
    try {
      // Determine shipping address data based on user status
      let shippingAddressData;
      let shippingAddressId = null;
      
      if (isLoggedIn) {
        // For logged-in users, use a saved address
        shippingAddressId = selectedAddressId;
      } else {
        // For guests, create temporary address data
        shippingAddressData = {
          fullName: `${guestFirstName} ${guestLastName}`,
          street: addressLine1,
          street2: addressLine2,
          city: city,
          state: state,
          zipCode: zipCode,
          country: country
        };
      }
      
      const orderData = {
        // Order details
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          size: item.size
        })),
        subtotal: calculateCartTotal(),
        tax: calculateCartTotal() * 0.07,
        shipping: calculateCartTotal() >= 100 ? 0 : 10,
        total: calculateCartTotal() + (calculateCartTotal() >= 100 ? 0 : 10) + (calculateCartTotal() * 0.07),
        
        // User/guest identification
        userId: isLoggedIn ? customerInfo.id : null,
        
        // Only include guest fields for actual guests
        guestEmail: isLoggedIn ? null : guestEmail,
        guestFirstName: isLoggedIn ? null : guestFirstName,
        guestLastName: isLoggedIn ? null : guestLastName,
        guestPhone: isLoggedIn ? null : guestPhone,
        
        // Address handling
        shippingAddressId,
        guestShippingAddress: !isLoggedIn ? shippingAddressData : null
      };
      
      // Send the order to your API
      const response = await axios.post('http://localhost:5001/api/orders', orderData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Rest of your order submission code...
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-red-700 underline text-sm mt-2"
          >
            Try refreshing the page
          </button>
        </div>
      )}
      
      {/* Empty cart message */}
      {(!cart || cart.length === 0) && (
        <div className="text-center p-8">
          <p className="text-lg mb-4">Your shopping cart is empty</p>
          <button 
            onClick={() => navigate('/collection')}
            className="px-4 py-2 bg-black text-white rounded-md"
          >
            Continue Shopping
          </button>
        </div>
      )}
      
      {/* Checkout form */}
      {cart && cart.length > 0 && (
        <div className="bg-white shadow-md rounded-md overflow-hidden">
          {clientSecret ? (
            <CheckoutForm 
              clientSecret={clientSecret}
              activeStep={activeStep}
              handleNextStep={handleNextStep}
              handlePreviousStep={handlePreviousStep}
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              shippingInfo={shippingInfo}
              setShippingInfo={setShippingInfo}
              processing={orderProcessing}
              setProcessing={setOrderProcessing}
              onOrderComplete={(orderId) => {
                setSuccessData({
                  orderId,
                  items: cart,
                  customerInfo
                });
                setPaymentSuccess(true);
              }}
              onSuccess={handlePaymentSuccess}
              cart={cart || []}
              subtotal={calculateCartTotal()}
              shipping={calculateCartTotal() >= 100 ? 0 : 10}
              tax={calculateCartTotal() * 0.07}
              // Add these new props for saved addresses
              savedAddresses={savedAddresses}
              selectedAddressId={selectedAddressId}
              setSelectedAddressId={setSelectedAddressId}
              loadingAddresses={loadingAddresses}
            />
          ) : (
            <div className="p-6">
              <h3 className="font-medium text-lg mb-2">Payment Processing</h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="ml-3">Setting up payment...</p>
                </div>
              ) : (
                <div>
                  <p className="text-amber-600 mb-4">Unable to initialize payment processing.</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-black text-white rounded-md"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {paymentSuccess && successData && (
        <PaymentSuccess 
          orderId={successData.orderId}
          items={successData.items}
          customerInfo={successData.customerInfo}
          clearCart={clearCart}
        />
      )}

      {/* Order Summary */}
      <OrderSummary 
        cart={cart} 
        subtotal={calculateCartTotal()} 
        shipping={calculateCartTotal() >= 100 ? 0 : 10} 
        tax={calculateCartTotal() * 0.07}
        shippingAddress={shippingInfo} // Pass the selected shipping address
      />
    </div>
  );
};

export default Checkout;