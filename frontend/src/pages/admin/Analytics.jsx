import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBox, FaShoppingCart, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5001/api/admin/analytics');
        console.log("Analytics data received:", response.data);
        setAnalyticsData(response.data);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError(err.message || "Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Data safety check - if no data is available
  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  // Now you can safely use the data
  const { totalRevenue, revenueByMonth, ordersByStatus, topProducts } = analyticsData;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
      
      {/* Key metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-indigo-100 p-3">
              <FaChartLine className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
              <p className="text-2xl font-bold">${totalRevenue?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3">
              <FaShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Total Orders</h3>
              <p className="text-2xl font-bold">{ordersByStatus?.reduce((sum, status) => sum + status.count, 0) || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3">
              <FaBox className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Products Sold</h3>
              <p className="text-2xl font-bold">{topProducts?.reduce((sum, product) => sum + product.quantity, 0) || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-yellow-100 p-3">
              <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Pending Orders</h3>
              <p className="text-2xl font-bold">{ordersByStatus?.find(s => s.status === 'pending')?.count || 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Average Order Value */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Average Order Value</h2>
        <div className="flex items-center">
          <div className="text-3xl font-bold text-indigo-600">
            ${totalRevenue && ordersByStatus ? 
              (totalRevenue / Math.max(1, ordersByStatus.reduce((sum, status) => sum + status.count, 0))).toFixed(2) 
              : '0.00'}
          </div>
          <div className="ml-4 text-sm text-gray-500">
            per order
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {revenueByMonth && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Monthly Revenue</h2>
            <Line 
              data={{
                labels: revenueByMonth.map(item => item.month),
                datasets: [{
                  label: 'Revenue',
                  data: revenueByMonth.map(item => item.revenue),
                  // other chart options
                }]
              }} 
            />
          </div>
        )}

        {ordersByStatus && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Order Status Distribution</h2>
            <div className="h-64">
              <Pie
                data={{
                  labels: ordersByStatus.map(item => item.status),
                  datasets: [{
                    data: ordersByStatus.map(item => item.count),
                    backgroundColor: [
                      '#4F46E5', // pending
                      '#F59E0B', // processing
                      '#10B981', // shipped
                      '#06B6D4', // delivered
                      '#EF4444'  // cancelled
                    ],
                    borderWidth: 1
                  }]
                }}
                options={{
                  plugins: {
                    legend: {
                      position: 'right',
                    }
                  },
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Products row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topProducts && topProducts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
            <div className="h-64">
              <Bar
                data={{
                  labels: topProducts.map(product => product.name),
                  datasets: [{
                    label: 'Units Sold',
                    data: topProducts.map(product => product.quantity),
                    backgroundColor: '#4F46E5',
                    borderRadius: 4
                  }]
                }}
                options={{
                  indexAxis: 'y',
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      }
                    },
                    y: {
                      grid: {
                        display: false
                      }
                    }
                  },
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Full width section */}
      <div>
        {analyticsData.recentOrders && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id.substring(0, 8)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.amount?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                          ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' : 
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;