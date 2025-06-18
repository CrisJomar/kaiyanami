import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const AdminSupportTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5001/api/support/${id}/messages`,
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh ticket data
      await fetchTicket();
      setNewMessage('');
      toast.success('Reply sent to customer');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
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
      
      // Update the ticket in the state
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
      <div className="p-6">
        <div className="flex justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Ticket Not Found</h2>
          <p className="text-gray-600 mb-4">The support ticket you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate('/admin/support')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <button 
          onClick={() => navigate('/admin/support')}
          className="text-blue-600 hover:underline"
        >
          ← Back to Support
        </button>
        
        <div className="flex space-x-2">
          <select
            value={ticket.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="px-3 py-1 border rounded"
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          
          <button
            onClick={fetchTicket}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2">
            <h1 className="text-2xl font-semibold mb-2">{ticket.subject}</h1>
            <p className="text-gray-600">
              Created on {new Date(ticket.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-gray-600">Status: </span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {ticket.status}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Priority: </span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                ticket.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {ticket.priority}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Customer: </span>
              {ticket.user?.email || ticket.guestEmail || 'Anonymous'}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Conversation</h2>
          
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto p-2 border border-gray-100 rounded">
            {ticket.messages.map((message, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${
                  message.fromUser 
                    ? 'bg-gray-50 mr-12' 
                    : 'bg-blue-50 ml-12'
                }`}
              >
                <div className="flex justify-between mb-1">
                  <span className="font-medium">
                    {message.fromUser ? 'Customer' : 'Support'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p>{message.message}</p>
              </div>
            ))}
          </div>
          
          {ticket.status !== 'CLOSED' && (
            <form onSubmit={handleSendMessage}>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Reply to Customer
                </label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  rows="4"
                  required
                ></textarea>
              </div>
              <div className="flex justify-between">
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={!newMessage.trim()}
                >
                  Send Reply
                </button>
                
                <div className="space-x-2">
                  {ticket.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Resolve Ticket
                    </button>
                  )}
                  
                  {ticket.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('CLOSED')}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
          
          {ticket.status === 'CLOSED' && (
            <div className="bg-gray-50 p-4 rounded text-center">
              <p className="text-gray-600 mb-2">
                This ticket is closed.
              </p>
              <button
                onClick={() => handleUpdateStatus('OPEN')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reopen Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportTicketDetail;