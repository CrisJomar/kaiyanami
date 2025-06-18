import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        const response = await axios.get(`http://localhost:5001/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Order details fetched:', response.data);
        setOrder(response.data);
      } catch (error) {
        console.error('Error fetching order details:', error);
        setError('Unable to load order details');
        toast.error('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-2 text-blue-600 hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">Order not found</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 hover:underline flex items-center"
        >
          ← Back to Dashboard
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Order Details</h1>
          <span className={`px-3 py-1 text-sm rounded-full ${
            order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
            order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {order.status}
          </span>
        </div>
        
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-medium">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date Placed</p>
              <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="font-medium text-lg mb-3">Items</h2>
          <div className="space-y-4">
            {(order.orderItems || order.items || []).map((item, index) => (
              <div key={index} className="flex items-center border-b border-gray-100 pb-4">
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-16 h-16 object-cover mr-4"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/64?text=Product';
                    }}
                  />
                )}
                <div className="flex-grow">
                  <p className="font-medium">{item.name}</p>
                  <div className="flex text-sm text-gray-600">
                    <p>Qty: {item.quantity}</p>
                    {item.size && <p className="ml-4">Size: {item.size}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${parseFloat(item.price).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    ${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="font-medium text-lg mb-3">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>${order.shipping?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>${order.tax?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>${order.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="font-medium text-lg mb-3">Shipping Address</h2>
          <address className="not-italic">
            {order.guestShippingAddress?.fullName || `${order.guestFirstName || ''} ${order.guestLastName || ''}`}<br />
            {order.guestShippingAddress?.street}<br />
            {order.guestShippingAddress?.city}, {order.guestShippingAddress?.state} {order.guestShippingAddress?.zipCode}<br />
            {order.guestShippingAddress?.country || 'United States'}
          </address>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;