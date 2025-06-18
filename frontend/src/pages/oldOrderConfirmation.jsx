import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { FaCheckCircle, FaBox, FaShippingFast, FaMapMarkerAlt, FaEnvelope } from 'react-icons/fa';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Email from session or local storage
  const email = sessionStorage.getItem('checkoutEmail') || localStorage.getItem('userEmail');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await axios.get(`http://localhost:5001/api/payment/order/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        setOrder(response.data);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('We could not find your order details. Please contact support.');
      } finally {
        setLoading(false);
      }
    };
    
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow-md my-8">
        <div className="text-center text-red-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold mt-2">Order Not Found</h2>
        </div>
        <p className="text-gray-600 text-center mb-6">{error}</p>
        <div className="text-center">
          <Link to="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Use mock data if order is not available (for testing)
  const displayOrder = order || {
    id: orderId || 'mock-order-123',
    createdAt: new Date().toISOString(),
    total: 129.99,
    status: 'processing',
    shippingAddress: {
      fullName: 'John Doe',
      address1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001'
    },
    orderItems: [
      { id: '1', productName: 'Sample Product', quantity: 2, price: 49.99 },
      { id: '2', productName: 'Another Item', quantity: 1, price: 30.01 }
    ]
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow-md my-8">
      <div className="text-center text-green-600 mb-6">
        <FaCheckCircle className="h-16 w-16 mx-auto" />
        <h1 className="text-2xl font-bold mt-2">Order Confirmed!</h1>
      </div>
      
      <div className="border-b pb-4 mb-4">
        <p className="text-gray-600">
          Thank you for your order. We've sent a confirmation to {email || 'your email address'}.
        </p>
        <p className="text-gray-600 mt-2">
          Your order number is: <span className="font-semibold">{displayOrder.id}</span>
        </p>
        <p className="text-gray-600">
          Placed on: {format(new Date(displayOrder.createdAt), 'MMMM d, yyyy')}
        </p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaBox className="mr-2" /> Order Status
        </h2>
        <div className="bg-blue-50 p-3 rounded">
          <p className="capitalize">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500 mr-2"></span>
            {displayOrder.status}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            We're preparing your order for shipment.
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaShippingFast className="mr-2" /> Delivery Details
        </h2>
        <div className="bg-gray-50 p-3 rounded">
          <p>Standard Shipping (3-5 business days)</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaMapMarkerAlt className="mr-2" /> Shipping Address
        </h2>
        <div className="bg-gray-50 p-3 rounded">
          <p>{displayOrder.shippingAddress.fullName}</p>
          <p>{displayOrder.shippingAddress.address1}</p>
          <p>
            {displayOrder.shippingAddress.city}, {displayOrder.shippingAddress.state} {displayOrder.shippingAddress.postalCode}
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
        <div className="border rounded overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayOrder.orderItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">${item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="2" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total:</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${displayOrder.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <div className="text-center mt-8">
        <Link to="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
          Continue Shopping
        </Link>
      </div>
      
      <div className="mt-6 text-center text-sm text-gray-600 flex items-center justify-center">
        <FaEnvelope className="mr-2" />
        <span>Need help? Email us at support@yourstore.com</span>
      </div>
    </div>
  );
};

export default OrderConfirmation;