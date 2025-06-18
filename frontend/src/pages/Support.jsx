import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Support = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('order_issue');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [userOrders, setUserOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Authentication status:', {
      isLoggedIn: !!token,
      token: token ? token.substring(0, 20) + "..." : null
    });
  }, []);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await axios.get('http://localhost:5001/api/support/my-tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!showNewTicketForm) return; 
      setLoadingOrders(true);
      try {
        console.log('Attempting to fetch user orders...');
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token available, skipping order fetch');
          return;
        }
        
        const response = await axios.get('http://localhost:5001/api/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Orders response:', {
          status: response.status,
          orderCount: response.data?.length || 0,
          firstOrderId: response.data?.[0]?.id || 'none'
        });
        
        setUserOrders(response.data || []);
      } catch (error) {
        console.error('Error fetching orders:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        toast.error('Failed to load your orders');
      } finally {
        setLoadingOrders(false);
      }
    };
    
    fetchUserOrders();
  }, [showNewTicketForm]); 

  const handleSubmitNewTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      
      
      console.log('Submitting ticket with order:', {
        relatedOrderId,
        hasValue: !!relatedOrderId && relatedOrderId !== ''
      });
      
    
      const requestBody = {
        subject,
        message,
        category,
        priority: 'MEDIUM'
      };
      
  
      if (relatedOrderId && relatedOrderId !== '') {
        requestBody.orderId = relatedOrderId;
      }
      
      const response = await axios.post(
        'http://localhost:5001/api/support',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      

      console.log('Ticket created:', {
        ticketId: response.data.id,
        hasOrder: !!response.data.order,
        orderId: response.data.orderId
      });
      
      fetchTickets();
      setShowNewTicketForm(false);
      setSubject('');
      setMessage('');
      setCategory('order_issue');
      setRelatedOrderId('');
      toast.success('Support ticket created successfully');
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast.error('Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-6">Customer Support</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - FAQs and Contact */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">How do I track my order?</h3>
                <p className="text-gray-600">You can track your order from your account dashboard.</p>
              </div>
              <div>
                <h3 className="font-medium">What is your return policy?</h3>
                <p className="text-gray-600">We accept returns within 30 days of purchase.</p>
              </div>
              <div>
                <h3 className="font-medium">How can I change my shipping address?</h3>
                <p className="text-gray-600">Contact us as soon as possible if you need to change your shipping address.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="space-y-2">
              <p>Email: support@kaiyanami.com</p>
              <p>Phone: (555) 123-4567</p>
              <p>Hours: Mon-Fri, 9am-5pm EST</p>
            </div>
          </div>
        </div>
        
        {/* Right column - Support tickets */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Support Tickets</h2>
              <button 
                onClick={() => {
                  setShowNewTicketForm(!showNewTicketForm);
               
                  if (!showNewTicketForm) {
                    const fetchOrdersNow = async () => {
                      try {
                        const token = localStorage.getItem('token');
                        if (!token) return;
                        
                        const response = await axios.get('http://localhost:5001/api/orders', {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        console.log('Orders loaded:', response.data?.length || 0);
                        setUserOrders(response.data || []);
                      } catch (err) {
                        console.error('Failed to load orders on form open', err);
                      }
                    };
                    
                    fetchOrdersNow();
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {showNewTicketForm ? 'Cancel' : 'New Ticket'}
              </button>
            </div>
            
            {showNewTicketForm && (
              <div className="mb-8 bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Create New Support Ticket</h2>
                <form onSubmit={handleSubmitNewTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="order_issue">Order Issue</option>
                      <option value="shipping">Shipping Problem</option>
                      <option value="return_refund">Return or Refund</option>
                      <option value="product_question">Product Question</option>
                      <option value="website_issue">Website Functionality</option>
                      <option value="account">Account Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="relatedOrder">
                      Related Order (Optional)
                    </label>
                    <select
                      id="relatedOrder"
                      value={relatedOrderId}
                      onChange={(e) => setRelatedOrderId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingOrders}
                    >
                      {loadingOrders ? (
                        <option>Loading orders...</option>
                      ) : (
                        <>
                          <option value="">No related order</option>
                          {userOrders.length === 0 ? (
                            <option disabled>No orders found</option>
                          ) : (
                            userOrders.map(order => (
                              <option key={order.id} value={order.id}>
                                Order #{order.id.substring(0, 8)} - {new Date(order.createdAt).toLocaleDateString()} - ${Number(order.total).toFixed(2)}
                              </option>
                            ))
                          )}
                        </>
                      )}
                    </select>
                    {userOrders.length === 0 && !loadingOrders && (
                      <p className="text-sm text-red-500 mt-1">No orders found. If you've placed orders, please try refreshing the page.</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="subject">
                      Subject (Optional)
                    </label>
                    <input
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Leave blank for auto-generated subject"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="message">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      rows="4"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    ></textarea>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowNewTicketForm(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Ticket'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              </div>
            ) : tickets.length > 0 ? (
              <div className="space-y-4">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="border p-4 rounded hover:bg-gray-50">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{ticket.subject}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">
                      Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => navigate(`/support/${ticket.id}`)}
                      className="text-blue-600 text-sm mt-2 hover:underline"
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                {localStorage.getItem('token') 
                  ? "You don't have any support tickets yet." 
                  : "Please log in to view your support tickets."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;