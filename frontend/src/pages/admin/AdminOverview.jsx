import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaBoxOpen, FaShoppingCart, FaUsers, FaDollarSign, 
  FaExclamationTriangle, FaComments, FaSync, FaChartLine,
  FaClock, FaCalendarAlt, FaBell
} from 'react-icons/fa';

const AdminOverview = () => {
  const navigate = useNavigate(); 
  const [stats, setStats] = useState({
    totalProducts: '-',
    totalOrders: '-',
    totalUsers: '-',
    totalRevenue: '-',
    lowStockCount: 0,
    pendingReviews: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Fetch dashboard stats
      const statsResponse = await axios.get('http://localhost:5001/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch recent orders (last 5)
      const ordersResponse = await axios.get('http://localhost:5001/api/admin/orders?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Set dashboard data
      const revenueValue = typeof statsResponse.data.totalRevenue === 'number' 
        ? statsResponse.data.totalRevenue 
        : parseFloat(statsResponse.data.totalRevenue || 0);
        
      setStats({
        totalProducts: statsResponse.data.totalProducts || 0,
        totalOrders: statsResponse.data.totalOrders || 0,
        totalUsers: statsResponse.data.totalCustomers || 0,
        totalRevenue: revenueValue,
        lowStockCount: statsResponse.data.lowStockCount || 0,
        pendingReviews: statsResponse.data.pendingReviews || 0
      });
      
      // Format and set orders
      const formattedOrders = Array.isArray(ordersResponse.data.orders) 
        ? ordersResponse.data.orders 
        : Array.isArray(ordersResponse.data) 
          ? ordersResponse.data
          : [];
      
      setRecentOrders(formattedOrders);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      toast.error('Error loading dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return typeof amount === 'number' 
      ? `$${amount.toFixed(2)}` 
      : amount;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Function to handle new product creation
  const handleAddNewProduct = () => {
    navigate('/admin/products');
    // Use timeout to allow navigation to complete before showing modal
    setTimeout(() => {
      // Dispatch a custom event that ProductManagement component can listen for
      const event = new CustomEvent('showAddProductModal');
      window.dispatchEvent(event);
    }, 100);
  };

  return (
    <div className="p-4">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
          ) : (
            <button 
              onClick={fetchDashboardData} 
              className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            >
              <FaSync className={isLoading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
          <button 
            onClick={fetchDashboardData} 
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Loading skeleton */}
      {isLoading && !error && (
        <div className="animate-pulse mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-md h-24 flex flex-col justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md h-64">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded w-full"></div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md h-64">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-full bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Dashboard content - only show when not loading */}
      {!isLoading && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-gray-500 text-sm font-medium">Total Products</h2>
                  <p className="text-2xl font-bold">{stats.totalProducts}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FaBoxOpen className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <Link to="/admin/products" className="text-blue-600 hover:underline">Manage products →</Link>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-gray-500 text-sm font-medium">Total Orders</h2>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <FaShoppingCart className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <Link to="/admin/orders" className="text-blue-600 hover:underline">View all orders →</Link>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-gray-500 text-sm font-medium">Total Users</h2>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <FaUsers className="h-6 w-6 text-purple-500" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <Link to="/admin/customers" className="text-blue-600 hover:underline">View all users →</Link>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-gray-500 text-sm font-medium">Total Revenue</h2>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <FaDollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <Link to="/admin/reports" className="text-blue-600 hover:underline">View reports →</Link>
              </div>
            </div>
            
            {stats.lowStockCount > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-400 transform hover:scale-105 transition-transform duration-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h2 className="text-gray-500 text-sm font-medium">Low Stock Products</h2>
                      <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Alert</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</p>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <FaExclamationTriangle className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <Link to="/admin/products?filter=low-stock" className="text-yellow-600 hover:underline">
                    Review low stock items →
                  </Link>
                </div>
              </div>
            )}
            
            {stats.pendingReviews > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-400 transform hover:scale-105 transition-transform duration-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h2 className="text-gray-500 text-sm font-medium">Pending Reviews</h2>
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Action</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{stats.pendingReviews}</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FaComments className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <Link to="/admin/reviews?filter=pending" className="text-blue-600 hover:underline">
                    Moderate reviews →
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick Actions Panel */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Quick Actions</h2>
                <FaBell className="text-gray-400" />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Changed to button with onClick handler */}
                <button 
                  onClick={handleAddNewProduct}
                  className="border border-gray-200 rounded p-4 hover:bg-blue-50 transition-colors flex justify-between items-center w-full text-left"
                >
                  <div>
                    <h3 className="font-medium text-blue-600">Add New Product</h3>
                    <p className="text-sm text-gray-500 mt-1">Create and publish a new item</p>
                  </div>
                  <FaBoxOpen className="text-blue-500" />
                </button>
                
                <Link 
                  to="/admin/orders?status=processing" 
                  className="border border-gray-200 rounded p-4 hover:bg-green-50 transition-colors flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium text-green-600">Process Orders</h3>
                    <p className="text-sm text-gray-500 mt-1">View and fulfill pending orders</p>
                  </div>
                  <FaShoppingCart className="text-green-500" />
                </Link>
                
                <Link 
                  to="/admin/reports" 
                  className="border border-gray-200 rounded p-4 hover:bg-purple-50 transition-colors flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium text-purple-600">View Analytics</h3>
                    <p className="text-sm text-gray-500 mt-1">Check store performance</p>
                  </div>
                  <FaChartLine className="text-purple-500" />
                </Link>
              </div>
            </div>
            
          
            <div className="lg:col-span-2 bg-white p-3 rounded-lg shadow-md h-full flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-medium flex items-center">
                  <FaClock className="mr-1.5 text-gray-500 text-xs" /> Recent Orders
                </h2>
                <Link to="/admin/orders" className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              
              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto flex-grow">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '20%'}}>ID</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '30%'}}>Customer</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '25%'}}>Status</th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '25%'}}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Limit to 5 orders with slice */}
                      {recentOrders.slice(0, 5).map((order) => (
                        <tr 
                          key={order.id || order.orderId} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/admin/orders/${order.id || order.orderId}`)}
                        >
                          <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-blue-600">
                            <Link to={`/admin/orders/${order.id || order.orderId}`}>
                              #{order.id || order.orderId}
                            </Link>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500 truncate max-w-[150px]">
                            {order.customerName || order.customer?.name || 'Guest'}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-medium rounded-full ${
                              order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                              order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900 text-right">
                            {formatCurrency(order.totalAmount || order.total)}
                          </td>
                        </tr>
                      ))}
                      
                      {/* Add placeholder rows if less than 5 orders */}
                      {recentOrders.length < 5 && [...Array(5 - recentOrders.length)].map((_, index) => (
                        <tr key={`placeholder-${index}`}>
                          <td colSpan="4" className="px-2 py-1.5 h-[26px]"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center py-6 text-center text-gray-500 border border-dashed border-gray-200 rounded">
                  <div>
                    <FaShoppingCart className="mx-auto h-5 w-5 text-gray-400 mb-2" />
                    <p className="text-xs">No recent orders</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOverview;