import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const AdminSupportTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`http://localhost:5001/api/support/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTicket(response.data);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom of messages
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticket?.messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `http://localhost:5001/api/support/${id}/messages`,
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update ticket with the new message
      setTicket({
        ...ticket,
        messages: [...ticket.messages, response.data]
      });
      
      setNewMessage('');
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.patch(
        `http://localhost:5001/api/support/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update ticket status in local state
      setTicket({
        ...ticket,
        status: newStatus
      });
      
      toast.success(`Ticket status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ticket Not Found</h2>
          <p className="text-gray-600 mb-6">The support ticket you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/support')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/admin/support')}
          className="text-blue-600 hover:underline flex items-center"
        >
          ← Back to Tickets
        </button>
        
        <div className="flex space-x-2">
          <select 
            value={ticket.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          
          <button
            onClick={fetchTicket}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{ticket.subject}</h1>
            <p className="text-gray-600">
              Ticket #{ticket.id} • Created on {new Date(ticket.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 
                ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' : 
                ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                {ticket.status}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                ticket.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 
                ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-green-100 text-green-800'
              }`}>
                {ticket.priority}
              </span>
            </div>
            
            {ticket.order && (
              <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-blue-900">Related Order Information</h3>
                  <a 
                    href={`/admin/orders/${ticket.order.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Order Details →
                  </a>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-blue-700">Order #:</p>
                    <p className="font-medium">{ticket.order.id.substring(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">Date:</p>
                    <p className="font-medium">{new Date(ticket.order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">Total:</p>
                    <p className="font-medium">${Number(ticket.order.total).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">Status:</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ticket.order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      ticket.order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                      ticket.order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ticket.order.status}
                    </span>
                  </div>
                </div>
                
                {ticket.order.orderItems && ticket.order.orderItems.length > 0 && (
                  <div className="mt-4 border-t border-blue-200 pt-3">
                    <p className="text-xs text-blue-700 mb-2">Order Items:</p>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                      {ticket.order.orderItems.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div>
                            <span className="font-medium">{item.product?.name || 'Product'}</span>
                            {item.size && <span className="text-gray-500 ml-1">({item.size})</span>}
                            <span className="text-gray-500 ml-1">x{item.quantity}</span>
                          </div>
                          <div>${Number(item.price).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-900 mb-2">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name:</p>
              <p className="font-medium">
                {ticket.user?.firstName} {ticket.user?.lastName || ticket.guestName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email:</p>
              <p className="font-medium">{ticket.user?.email || ticket.guestEmail || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Conversation</h2>
          
          <div className="space-y-6 max-h-[400px] overflow-y-auto mb-6 p-2 border border-gray-100 rounded-md">
            {ticket.messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.fromUser ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[75%] rounded-lg p-4 ${
                  message.fromUser ? 'bg-gray-100 text-gray-900' : 'bg-blue-100 text-blue-900'
                }`}>
                  <div className="text-sm mb-1">
                    {message.fromUser ? (ticket.user?.firstName || ticket.guestName || 'Customer') : (message.staffName || 'Staff')}
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{message.message}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {ticket.status !== 'CLOSED' && (
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reply">
                  Reply to Customer
                </label>
                <textarea
                  id="reply"
                  rows="4"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                ></textarea>
              </div>
              
              <div className="flex justify-between">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={submitting || !newMessage.trim()}
                >
                  {submitting ? 'Sending...' : 'Send Reply'}
                </button>
                
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('RESOLVED')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Resolve Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('CLOSED')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Close Ticket
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {ticket.status === 'CLOSED' && (
            <div className="text-center py-4 bg-gray-50 rounded-md">
              <p className="text-gray-600">
                This ticket is closed. You cannot add more messages.
              </p>
              <button
                onClick={() => handleUpdateStatus('OPEN')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Reopen Ticket
              </button>
            </div>
          )}
        </div>
        
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold mb-4">Attachments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ticket.attachments.map((attachment) => (
                <div key={attachment.id} className="border border-gray-200 rounded-md p-3 flex items-center">
                  <svg className="h-6 w-6 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium">{attachment.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {Math.round(attachment.fileSize / 1024)} KB
                    </p>
                  </div>
                  <a 
                    href={`http://localhost:5001${attachment.fileUrl}`} 
                    download={attachment.fileName}
                    className="text-blue-600 hover:text-blue-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportTicketDetail;