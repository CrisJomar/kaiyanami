import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChevronDown, FaChevronUp, FaBox } from 'react-icons/fa';
import { toast } from 'react-toastify';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});
  const [trackingModal, setTrackingModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found');
          setIsLoading(false);
          return;
        }
        
        const response = await axios.get('http://localhost:5001/api/admin/orders', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setOrders(response.data);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to load orders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // If changing to shipped status, open tracking modal
      if (newStatus === 'shipped') {
        setCurrentOrderId(orderId);
        setTrackingNumber('');
        setTrackingModal(true);
        return; // Don't update status yet
      }
      
      // For all other status changes, proceed normally
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found');
        return;
      }
      
      await axios.patch(
        `http://localhost:5001/api/admin/orders/${orderId}/status`, 
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status. Please try again.');
    }
  };

  const handleTrackingSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }
      
      // Make API call to update both status and tracking info
      await axios.patch(
        `http://localhost:5001/api/admin/orders/${currentOrderId}/ship`, 
        { 
          trackingNumber,
          sendEmail: true // Tell backend to send notification email
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === currentOrderId ? { 
          ...order, 
          status: 'shipped',
          trackingNumber
        } : order
      ));
      
      // Close modal and reset state
      setTrackingModal(false);
      setCurrentOrderId(null);
      setTrackingNumber('');
      
      toast.success('Order marked as shipped and notification email sent');
    } catch (error) {
      console.error('Error updating shipping information:', error);
      setError('Failed to update shipping information');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Replace your current fetchUserAddressesForOrder function with this one
const fetchUserAddressesForOrder = async (orderData) => {
  // If the order already has a detailed address or has a special flag indicating we already tried, skip
  if ((orderData.shippingInfo?.address1 && 
       orderData.shippingInfo.address1 !== '[Address not provided during checkout]' &&
       orderData.shippingInfo.address1 !== 'Address not saved') || 
      orderData.addressesChecked) {
    return orderData;
  }
  
  try {
    const token = localStorage.getItem('token');
    console.log(`Fetching addresses for user ${orderData.userId || 'unknown'}`);
    
    // Use the admin-specific endpoint that bypasses role checks
    const response = await axios.get(
      `http://localhost:5001/api/users/admin-access/${orderData.userId}/addresses`, 
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    console.log(`Got ${response.data.length} addresses for user`);
    
    if (response.data && response.data.length > 0) {
      // Find default address or use the first one
      const address = response.data.find(addr => addr.isDefault) || response.data[0];
      
      console.log("Found address to use:", address);
      
      return {
        ...orderData,
        addressesChecked: true, // Mark that we've already checked addresses
        shippingInfo: {
          fullName: `${orderData.user.firstName} ${orderData.user.lastName}`,
          address1: address.address1,
          address2: address.address2 || '',
          city: address.city,
          state: address.state,
          postalCode: address.postalCode || address.zipCode,
          country: address.country || 'US',
          note: "Retrieved from user's saved addresses"
        }
      };
    }
    
    // Still mark that we checked even if no addresses found
    return {
      ...orderData,
      addressesChecked: true,
      shippingInfo: {
        ...orderData.shippingInfo,
        note: orderData.shippingInfo.note || "No saved addresses found for this user"
      }
    };
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    
    // Mark as checked to avoid repeated failing attempts
    return {
      ...orderData,
      addressesChecked: true,
      shippingInfo: {
        ...orderData.shippingInfo,
        note: `Error loading addresses: ${error.message}`
      }
    };
  }
};

// Also update the toggleOrderDetails function to use this
const toggleOrderDetails = async (orderId) => {
  // If clicking the same row, toggle it closed
  if (expandedOrder === orderId) {
    setExpandedOrder(null);
    return;
  }
  
  setExpandedOrder(orderId);
  
  // Only fetch if we don't already have the details cached
  if (!orderDetails[orderId]) {
    try {
      const token = localStorage.getItem('token');
      
      // Get order details
      const response = await axios.get(`http://localhost:5001/api/admin/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("Order details received:", response.data);
      
      // First, extract shipping info from what's in the order
      let processedData = {
        ...response.data,
        shippingInfo: extractShippingInfo(response.data)
      };
      
      // Then, try to fetch from user's saved addresses if no address found
      if ((!processedData.shippingInfo.address1 || 
           processedData.shippingInfo.address1 === '[Address not provided during checkout]') && 
          response.data.userId) {
        console.log("No address in order, will check saved addresses");
        processedData = await fetchUserAddressesForOrder(processedData);
      }
      
      // Update the state with processed data
      setOrderDetails({
        ...orderDetails,
        [orderId]: processedData
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Failed to load order details. Please try again.');
    }
  }
};

  // Replace your existing extractShippingInfo function with this more comprehensive version
  const extractShippingInfo = (orderData) => {
    // First try to debug what data we have
    console.log("Extracting shipping info from order:", orderData.id, {
      hasShippingAddress: !!orderData.shippingAddress,
      hasGuestShipping: !!orderData.guestShippingAddress,
      hasMetadata: !!orderData.metadata,
      hasGuestInfo: !!(orderData.guestFirstName || orderData.guestEmail),
      hasUser: !!orderData.user
    });
    
    // Option 1: Check for shippingAddress in relation
    if (orderData.shippingAddress) {
      return {
        fullName: `${orderData.user?.firstName || ''} ${orderData.user?.lastName || ''}`.trim(),
        email: orderData.user?.email,
        address1: orderData.shippingAddress.street,
        city: orderData.shippingAddress.city,
        state: orderData.shippingAddress.state,
        postalCode: orderData.shippingAddress.zipCode,
        country: orderData.shippingAddress.country
      };
    }
    
    // Option 2: Check for guestShippingAddress
    if (orderData.guestShippingAddress) {
      return {
        fullName: orderData.guestShippingAddress.fullName,
        address1: orderData.guestShippingAddress.street,
        city: orderData.guestShippingAddress.city,
        state: orderData.guestShippingAddress.state,
        postalCode: orderData.guestShippingAddress.zipCode,
        country: orderData.guestShippingAddress.country || 'US',
        email: orderData.guestEmail
      };
    }
    
    // Option 3: Try to parse metadata if it exists
    if (orderData.metadata && typeof orderData.metadata === 'string') {
      try {
        const metadata = JSON.parse(orderData.metadata);
        if (metadata.shippingInfo) {
          return metadata.shippingInfo;
        }
        if (metadata.shippingData) {
          return metadata.shippingData;
        }
      } catch (e) {
        console.error('Error parsing order metadata:', e);
      }
    }
    
    // Option 4: Check for direct shippingInfo object
    if (orderData.shippingInfo && typeof orderData.shippingInfo === 'object') {
      return orderData.shippingInfo;
    }
    
    // Option 5: For guest orders, create a composite from guest info - IMPROVED VERSION
    if (orderData.guestEmail || orderData.guestFirstName || orderData.guestLastName) {
      // Better debug what fields are actually available
      console.log("Guest order data fields:", {
        hasGuestAddress: !!orderData.guestAddress,
        hasShippingAddress1: !!orderData.shippingAddress1,
        guestAddressFields: Object.keys(orderData).filter(key => key.startsWith('guest') || key.startsWith('shipping'))
      });
      
      // Combine fields to create the most complete address possible
      return {
        fullName: `${orderData.guestFirstName || ''} ${orderData.guestLastName || ''}`.trim(),
        email: orderData.guestEmail,
        phone: orderData.guestPhone,
        // Check for shipping data in more possible field names
        address1: orderData.address || orderData.guestAddress || orderData.shippingAddress1 || 
                 orderData.shipping?.address || orderData.shipping?.address1 || 
                 '[Address not provided during checkout]',
        city: orderData.guestCity || orderData.shippingCity || orderData.shipping?.city || '',
        state: orderData.guestState || orderData.shippingState || orderData.shipping?.state || '',
        postalCode: orderData.guestZip || orderData.guestPostalCode || orderData.shippingZip || 
                    orderData.shipping?.postalCode || '',
        country: orderData.guestCountry || orderData.shipping?.country || 'US',
        note: 'Guest checkout with logged-in account - Address may be incomplete'
      };
    }
    
    // Option 6: For logged-in users, at least return user info
    if (orderData.user) {
      return {
        fullName: `${orderData.user.firstName || ''} ${orderData.user.lastName || ''}`.trim(),
        email: orderData.user.email,
        note: 'User account exists but shipping address is missing'
      };
    }
    
    // If nothing else works, at least log the order structure for debugging
    console.warn('Could not extract shipping info for order:', orderData.id);
    console.log('Order data structure:', JSON.stringify(orderData, null, 2));
    
    // Return a basic object to avoid errors
    return {
      note: 'No shipping information available for this order'
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Order Management</h1>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className={`${expandedOrder === order.id ? 'bg-blue-50' : ''} cursor-pointer hover:bg-gray-50`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => toggleOrderDetails(order.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {expandedOrder === order.id ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={() => toggleOrderDetails(order.id)}
                    >
                      #{order.id.substring(0, 8)}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={() => toggleOrderDetails(order.id)}
                    >
                      {order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={() => toggleOrderDetails(order.id)}
                    >
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={() => toggleOrderDetails(order.id)}
                    >
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                  
                  {/* Expanded order details row */}
                  {expandedOrder === order.id && (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 bg-gray-50">
                        <div className="border rounded-lg overflow-hidden">
                          {orderDetails[order.id] ? (
                            <div>
                              <div className="px-4 py-3 bg-gray-100 border-b flex justify-between">
                                <h3 className="font-medium">Order Details</h3>
                                <span>{orderDetails[order.id].orderItems?.length || 0} items</span>
                              </div>
                              
                              <div className="p-4">
                                {/* Shipping information */}
                                <div className="mb-4">
                                  <h4 className="font-medium mb-2">Shipping Information</h4>
                                  
                                  {/* Add a debug section to help understand the structure */}
                                  {import.meta.env.DEV && (
                                    <div className="bg-gray-100 p-2 mb-2 rounded text-xs overflow-auto max-h-32 hidden">
                                      <p className="font-bold mb-1">Debug - Available Order Keys:</p>
                                      {Object.keys(orderDetails[order.id] || {}).join(', ')}
                                    </div>
                                  )}
                                  
                                  {orderDetails[order.id]?.shippingInfo ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        {orderDetails[order.id].shippingInfo.fullName && (
                                          <p><span className="font-medium">Name:</span> {orderDetails[order.id].shippingInfo.fullName}</p>
                                        )}
                                        
                                        {orderDetails[order.id].shippingInfo.email && (
                                          <p><span className="font-medium">Email:</span> {orderDetails[order.id].shippingInfo.email}</p>
                                        )}
                                        
                                        {orderDetails[order.id].shippingInfo.phone && (
                                          <p><span className="font-medium">Phone:</span> {orderDetails[order.id].shippingInfo.phone}</p>
                                        )}
                                        
                                        {orderDetails[order.id].shippingInfo.address1 ? (
                                          <>
                                            <p><span className="font-medium">Address:</span> {orderDetails[order.id].shippingInfo.address1}</p>
                                            {orderDetails[order.id].shippingInfo.address2 && (
                                              <p><span className="font-medium">Address 2:</span> {orderDetails[order.id].shippingInfo.address2}</p>
                                            )}
                                          </>
                                        ) : (
                                          <p className="text-amber-600 italic text-sm mt-2">
                                            Address details not available. This may be a guest checkout or incomplete order.
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        {orderDetails[order.id].shippingInfo.city && (
                                          <p><span className="font-medium">City:</span> {orderDetails[order.id].shippingInfo.city}</p>
                                        )}
                                        
                                        {orderDetails[order.id].shippingInfo.state && (
                                          <p><span className="font-medium">State/Province:</span> {orderDetails[order.id].shippingInfo.state}</p>
                                        )}
                                        
                                        {orderDetails[order.id].shippingInfo.postalCode && (
                                          <p><span className="font-medium">Postal Code:</span> {orderDetails[order.id].shippingInfo.postalCode || orderDetails[order.id].shippingInfo.zipCode}</p>
                                        )}
                                        
                                        {orderDetails[order.id].shippingInfo.country && (
                                          <p><span className="font-medium">Country:</span> {orderDetails[order.id].shippingInfo.country}</p>
                                        )}
                                        
                                        {orderDetails[order.id].shippingInfo.note && (
                                          <p className="text-amber-600">{orderDetails[order.id].shippingInfo.note}</p>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-500">
                                      No shipping information available
                                      <button 
                                        className="ml-2 text-blue-500 underline" 
                                        onClick={() => console.log("Full Order Details:", orderDetails[order.id])}
                                      >
                                        Debug
                                      </button>
                                    </p>
                                  )}
                                  {/* Add this component inside your shipping information section where the address is missing */}
                                  {!orderDetails[order.id].shippingInfo?.address1 && orderDetails[order.id].user && (
                                    <div className="mt-3 p-3 border border-amber-300 bg-amber-50 rounded-md">
                                      <h4 className="font-medium text-amber-700 mb-2">Address Missing</h4>
                                      <p className="text-amber-600 text-sm mb-2">
                                        The shipping address for this order is incomplete. This may be due to an issue with your checkout process.
                                      </p>
                                      <details className="text-sm">
                                        <summary className="cursor-pointer text-blue-600 hover:underline">Troubleshooting Tips</summary>
                                        <div className="mt-2 pl-4 text-gray-700">
                                          <ul className="list-disc space-y-1">
                                            <li>Check your checkout process for saving addresses</li>
                                            <li>Make sure the shipping address is being saved to orders</li>
                                            <li>Verify the order creation API saves address data</li>
                                            <li>Check if addresses are being saved separately from orders</li>
                                          </ul>
                                        </div>
                                      </details>
                                    </div>
                                  )}
                                </div>

                                {/* Display tracking number if available */}
                                {orderDetails[order.id]?.trackingNumber && (
                                  <div className="mb-4 bg-blue-50 p-3 rounded-md">
                                    <h4 className="font-medium mb-1">Tracking Information</h4>
                                    <p><span className="font-medium">Tracking Number:</span> {orderDetails[order.id].trackingNumber}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      Shipment notification email was sent to the customer.
                                    </p>
                                  </div>
                                )}
                                
                                {/* Order items */}
                                <h4 className="font-medium mb-2">Order Items</h4>
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {orderDetails[order.id].orderItems?.map((item) => (
                                      <tr key={item.id}>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <div className="flex items-center">
                                            {item.product?.imageUrl && item.product.imageUrl[0] ? (
                                              <img src={item.product.imageUrl[0]} alt={item.product.name} className="h-10 w-10 object-cover rounded mr-2" />
                                            ) : (
                                              <div className="h-10 w-10 bg-gray-200 rounded mr-2 flex items-center justify-center">
                                                <FaBox className="text-gray-400" />
                                              </div>
                                            )}
                                            <span>{item.product?.name || item.productName || 'Product not available'}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">{item.quantity}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">${Number(item.price).toFixed(2)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">${(Number(item.price) * item.quantity).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr>
                                      <td colSpan="3" className="px-4 py-2 text-right font-medium">Subtotal:</td>
                                      <td className="px-4 py-2">${Number(orderDetails[order.id].subtotal || 0).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan="3" className="px-4 py-2 text-right font-medium">Shipping:</td>
                                      <td className="px-4 py-2">${Number(orderDetails[order.id].shippingCost || 0).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan="3" className="px-4 py-2 text-right font-medium">Tax:</td>
                                      <td className="px-4 py-2">${Number(orderDetails[order.id].tax || 0).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan="3" className="px-4 py-2 text-right font-medium">Total:</td>
                                      <td className="px-4 py-2 font-bold">${Number(orderDetails[order.id].total || 0).toFixed(2)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center p-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                              <span className="ml-2">Loading order details...</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {expandedOrder === order.id && orderDetails[order.id] && (
                    <tr>
                      <td colSpan="7" className="px-6 py-2 bg-gray-50 border-t">
                        <div className="mt-2 mb-4">
                          <button
                            onClick={() => {
                              const debugElem = document.getElementById(`debug-order-${order.id}`);
                              if (debugElem) {
                                debugElem.classList.toggle('hidden');
                              }
                            }}
                            className="text-xs text-blue-600 underline"
                          >
                            Debug Order Data
                          </button>
                          
                          <div id={`debug-order-${order.id}`} className="hidden mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-48">
                            <p className="font-semibold mb-1">Available Order Fields:</p>
                            <ul className="list-disc list-inside">
                              {Object.keys(orderDetails[order.id]).map(key => (
                                <li key={key}>
                                  {key}: {typeof orderDetails[order.id][key] === 'object' 
                                    ? JSON.stringify(orderDetails[order.id][key]) 
                                    : orderDetails[order.id][key]}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {trackingModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Enter Tracking Number</h2>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 mb-4 w-full"
              placeholder="Tracking Number"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setTrackingModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleTrackingSubmit}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Number Modal */}
      {trackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Tracking Number</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="trackingNumber">
                  Tracking Number
                </label>
                <input
                  id="trackingNumber"
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  This will automatically send a notification email to the customer.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setTrackingModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTrackingSubmit}
                disabled={isSubmitting || !trackingNumber}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Mark as Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;