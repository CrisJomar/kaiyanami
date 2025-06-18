import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaCheckCircle, FaBox, FaShippingFast, FaMapMarkerAlt, 
  FaEnvelope, FaCreditCard, FaReceipt, FaArrowRight, 
  FaPrint, FaDownload, FaExclamationTriangle
} from 'react-icons/fa';

const OrderConfirmation = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  
  const { orderId } = useParams();
  
  useEffect(() => {
  
    const storedEmail = sessionStorage.getItem('checkoutEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
    
  
    const wasEmailSent = sessionStorage.getItem('orderEmailSent') === 'true';
    setEmailSent(wasEmailSent);
    
    const fetchOrder = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }
      
      try {
        console.log("Fetching order:", orderId); 
        
        // Try the public endpoint first
        const response = await axios.get(`http://localhost:5001/api/orders/public/${orderId}`)
          .catch(async () => {
            // If public endpoint fails, try the authenticated endpoint
            return await axios.get(`http://localhost:5001/api/orders/${orderId}`);
          });
          
        if (response && response.data) {
          setOrder(response.data);
          
          if (response.data.guestEmail) {
            setEmail(response.data.guestEmail);
          }
          
          if (response.data.emailSent !== undefined) {
            setEmailSent(response.data.emailSent);
          }
        } else {
          throw new Error("No order data returned");
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        setError(error.response?.status === 404 
          ? 'Order not found. The order ID may be incorrect.'
          : 'Unable to load your order details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
    
    return () => {
      sessionStorage.removeItem('orderEmailSent');
    };
  }, [orderId]); 
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getEstimatedDelivery = () => {
    if (!order?.createdAt) return 'N/A';
    
    const orderDate = new Date(order.createdAt);
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(orderDate.getDate() + 7); 
    
    return formatDate(deliveryDate);
  };
  
  const handlePrintOrder = () => {
    window.print();
  };
  
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Format as USD
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center my-16">
        <div className="animate-pulse">
          <div className="h-16 w-16 bg-blue-200 rounded-full mx-auto"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mt-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mt-4"></div>
          <div className="mt-8 space-y-4">
            <div className="h-24 bg-gray-100 rounded"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
            <div className="h-24 bg-gray-100 rounded"></div>
          </div>
        </div>
        <p className="mt-6 text-gray-600">Loading order details...</p>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto p-8 bg-white rounded-lg shadow-lg my-16">
        <div className="text-center text-red-600 mb-8">
          <FaExclamationTriangle className="h-16 w-16 mx-auto" />
          <h1 className="text-2xl font-bold mt-4">Order Not Found</h1>
          <p className="mt-2 text-gray-700">{error || "We couldn't find details for this order."}</p>
        </div>
        
        <div className="space-y-4 text-center">
          <p className="text-gray-600">
            This could happen if:
          </p>
          <ul className="list-disc text-left mx-auto w-fit text-gray-600">
            <li>The order was placed more than 90 days ago</li>
            <li>The order ID entered was incorrect</li>
            <li>There was an issue during checkout</li>
          </ul>
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 text-center">
            Return to Homepage
          </Link>
          <button 
            onClick={() => navigate('/contact')}
            className="inline-block bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded hover:bg-blue-50 text-center"
          >
            Contact Support
          </button>
        </div>
      </div>
    );
  }
  
  // Removed the shippingInfo object and formatAddress function
  
  const subtotal = order.subtotal || 
    order.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0;
  
  const tax = order.tax || 0;
  const shipping = order.shipping || 0;
  const total = order.total || (subtotal + tax + shipping);
  
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg my-8 print:shadow-none">
      {/* Order Success Header */}
      <div className="text-center mb-8">
        <div className="bg-green-50 inline-block p-4 rounded-full">
          <FaCheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold mt-4">Order Confirmed!</h1>
        <p className="text-gray-600 mt-2">
          Thank you for your purchase! Your order has been received and is being processed.
        </p>
      </div>
      
      {/* Order Info Cards - Changed to single card */}
      <div className="mb-8">
        {/* Order Details */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex items-start">
            <FaReceipt className="h-5 w-5 text-blue-600 mt-1 mr-2" />
            <div>
              <h2 className="font-semibold text-gray-800">Order Information</h2>
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  <span className="text-gray-600">Order Number:</span>{' '}
                  <span className="font-medium">{order.id}</span>
                </p>
                <p>
                  <span className="text-gray-600">Date Placed:</span>{' '}
                  <span className="font-medium">{formatDate(order.createdAt)}</span>
                </p>
                <p>
                  <span className="text-gray-600">Payment Method:</span>{' '}
                  <span className="font-medium">
                    {order.paymentMethod || 'Credit Card'}
                    {order.lastFour && ` (**** ${order.lastFour})`}
                  </span>
                </p>
                <p>
                  <span className="text-gray-600">Order Status:</span>{' '}
                  <span className="font-medium text-green-600">{order.status || 'Processing'}</span>
                </p>
                <p>
                  <span className="text-gray-600">Estimated Delivery:</span>{' '}
                  <span className="font-medium">{getEstimatedDelivery()}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Order Summary */}
      <div className="border rounded-lg overflow-hidden mb-8">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="font-semibold text-lg text-gray-800">Order Summary</h2>
        </div>
        
        {/* Order Items */}
        <div className="divide-y">
          {order.items && order.items.map((item, index) => (
            <div key={index} className="p-6 flex items-start">
              <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden mr-4">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.productName || item.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {e.target.src = 'src/assets/placeholder-product.png'}}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <FaBox className="text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <h3 className="font-medium text-gray-800">{item.productName || item.name}</h3>
                
                <div className="mt-1 text-sm text-gray-600">
                  <p>Qty: {item.quantity}</p>
                  {item.selectedSize && <p>Size: {item.selectedSize}</p>}
                  {item.color && <p>Color: {item.color}</p>}
                  {item.variant && <p>Variant: {item.variant}</p>}
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(item.price)} each
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Order Totals */}
        <div className="bg-gray-50 px-6 py-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping:</span>
              <span>{formatCurrency(shipping)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Email Confirmation */}
      <div className="bg-blue-50 p-6 rounded-lg mb-8 border border-blue-100">
        <div className="flex items-center">
          <FaEnvelope className="h-5 w-5 text-blue-500 mr-2" />
          <h2 className="font-semibold text-blue-800">Email Confirmation</h2>
        </div>
        <p className="mt-2 text-blue-700">
          {emailSent 
            ? `We've sent a confirmation to ${email || 'your email address'}.` 
            : `A confirmation will be sent to ${email || 'your email address'} shortly.`
          }
        </p>
        <p className="mt-2 text-sm text-blue-600">
          If you don't see it, please check your spam or promotions folder.
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap justify-between items-center gap-4 print:hidden">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePrintOrder}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
          >
            <FaPrint />
            <span>Print Receipt</span>
          </button>
          
          <button
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-400 px-4 py-2 rounded cursor-not-allowed"
            disabled
          >
            <FaDownload />
            <span>Download PDF</span>
          </button>
        </div>
        
        <Link 
          to="/collection" 
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
        >
          <span>Continue Shopping</span>
          <FaArrowRight />
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;