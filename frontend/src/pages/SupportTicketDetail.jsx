import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const SupportTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        const response = await axios.get(`http://localhost:5001/api/support/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setTicket(response.data);
      } catch (error) {
        console.error('Error fetching ticket:', error);
        toast.error('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTicket();
  }, [id, navigate]);

  useEffect(() => {
   
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticket?.messages]);

  useEffect(() => {
  
    if (ticket) {
      console.log('Ticket loaded with order data:', {
        hasOrder: !!ticket.order,
        orderId: ticket.orderId
      });
    }
  }, [ticket]);

  const handleNewMessage = async (e) => {
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

  const handleFileUpload = async () => {
    if (!file) return;
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(
        `http://localhost:5001/api/support/${id}/attachments`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      

      const response = await axios.get(`http://localhost:5001/api/support/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTicket(response.data);
      setFile(null);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ticket Not Found</h2>
          <p className="text-gray-600 mb-6">The support ticket you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/support')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/support')}
          className="text-blue-600 hover:underline flex items-center"
        >
          ← Back to Support
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{ticket.subject}</h1>
            <p className="text-gray-600">
              Ticket #{ticket.id.substring(0, 8)} • Created on {new Date(ticket.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className={`px-3 py-1 text-sm rounded-full ${
            ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 
            ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' : 
            ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {ticket.status}
          </span>
        </div>
        
        {ticket.order && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-blue-900">Related Order Information</h3>
              <button 
                onClick={() => navigate(`/orders/${ticket.order.id}`)}
                className="text-blue-600 hover:underline text-sm"
              >
                View Order Details →
              </button>
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
                <p className={`px-2 py-1 text-xs rounded-full inline-block ${
                  ticket.order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  ticket.order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                  ticket.order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {ticket.order.status}
                </p>
              </div>
            </div>
            
            {ticket.order.orderItems?.length > 0 && (
              <div className="mt-4 border-t border-blue-200 pt-3">
                <p className="text-xs text-blue-700 mb-2">Order Items:</p>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                  {ticket.order.orderItems.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex items-center">
                        {item.product?.imageUrl?.length > 0 && (
                          <img 
                            src={item.product.imageUrl[0]} 
                            alt={item.product.name} 
                            className="w-10 h-10 object-cover rounded mr-3"
                          />
                        )}
                        <div>
                          <span className="font-medium">{item.product?.name || 'Product'}</span>
                          {item.size && <span className="text-gray-500 ml-1">({item.size})</span>}
                          <span className="text-gray-500 ml-1">x{item.quantity}</span>
                        </div>
                      </div>
                      <div>${Number(item.price).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Conversation</h2>
          
          <div className="space-y-6 max-h-96 overflow-y-auto mb-6 p-2">
            {ticket.messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.fromUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-lg p-4 ${
                  message.fromUser ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm mb-1">
                    {message.fromUser ? 'You' : message.staffName || 'Support Staff'}
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{message.message}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
            <form onSubmit={handleNewMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newMessage">
                  Reply
                </label>
                <textarea
                  id="newMessage"
                  rows="4"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                ></textarea>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={submitting || !newMessage.trim()}
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
                
                <div className="flex-1">
                  <input 
                    type="file" 
                    id="attachment"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                  />
                  <div className="flex items-center space-x-2">
                    <label 
                      htmlFor="attachment"
                      className="cursor-pointer text-blue-600 hover:text-blue-800"
                    >
                      Attach File
                    </label>
                    {file && (
                      <>
                        <span className="text-sm text-gray-600 truncate max-w-xs">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={handleFileUpload}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Upload
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}
          
          {(ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') && (
            <div className="text-center py-4 bg-gray-50 rounded-md">
              <p className="text-gray-600">
                This ticket is {ticket.status.toLowerCase()}. You cannot add more messages.
              </p>
              <button
                onClick={() => setShowNewTicketForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Create a new ticket
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

export default SupportTicketDetail;