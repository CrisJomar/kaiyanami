import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isAfter, isBefore } from 'date-fns';
import { toast } from 'react-toastify';
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
  Filler
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
  Legend,
  Filler
);

const Reports = () => {
  const [reportType, setReportType] = useState('sales');
  const [timeRange, setTimeRange] = useState('7days');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Handle time range change
  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    
    // Initialize custom dates when switching to custom range
    if (value === 'custom') {
      const today = new Date();
      const lastMonth = subDays(today, 30);
      setCustomStartDate(format(lastMonth, 'yyyy-MM-dd'));
      setCustomEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  // Validate custom date range
  const validateCustomDateRange = () => {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates');
      return false;
    }

    const start = parseISO(customStartDate);
    const end = parseISO(customEndDate);
    
    if (isAfter(start, end)) {
      toast.error('Start date cannot be after end date');
      return false;
    }
    
    return true;
  };

  // Fetch report data based on selected parameters
  useEffect(() => {
    const fetchReportData = async () => {
      // For custom range, validate dates first
      if (timeRange === 'custom' && !validateCustomDateRange()) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        
        // Calculate date range
        let startDate, endDate;
        const today = new Date();
        
        switch(timeRange) {
          case '7days':
            startDate = format(subDays(today, 7), 'yyyy-MM-dd');
            endDate = format(today, 'yyyy-MM-dd');
            break;
          case '30days':
            startDate = format(subDays(today, 30), 'yyyy-MM-dd');
            endDate = format(today, 'yyyy-MM-dd');
            break;
          case 'month':
            startDate = format(startOfMonth(today), 'yyyy-MM-dd');
            endDate = format(endOfMonth(today), 'yyyy-MM-dd');
            break;
          case 'year':
            startDate = format(startOfYear(today), 'yyyy-MM-dd');
            endDate = format(endOfYear(today), 'yyyy-MM-dd');
            break;
          case 'custom':
            startDate = customStartDate;
            endDate = customEndDate;
            break;
          default:
            startDate = format(subDays(today, 7), 'yyyy-MM-dd');
            endDate = format(today, 'yyyy-MM-dd');
        }
        
        try {
          const response = await axios.get(`http://localhost:5001/api/admin/reports/${reportType}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { startDate, endDate }
          });
          
          setReportData(response.data);
        } catch (apiError) {
          // Check if endpoint doesn't exist
          if (apiError.response && apiError.response.status === 404) {
            setError(`The ${reportType} report endpoint is not available in the current API implementation.`);
          } else {
            throw apiError; // Re-throw other errors to be caught by outer catch
          }
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
        setError(`Failed to load report data: ${error.message || 'Unknown error'}`);
        toast.error('Error loading report data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportData();
  }, [reportType, timeRange, customStartDate, customEndDate]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('token');
      
      // Calculate current date range
      let startDate, endDate;
      
      if (reportData?.dateRange) {
        startDate = reportData.dateRange.start;
        endDate = reportData.dateRange.end;
      } else {
        const today = new Date();
        switch(timeRange) {
          case '7days':
            startDate = format(subDays(today, 7), 'yyyy-MM-dd');
            endDate = format(today, 'yyyy-MM-dd');
            break;
          case '30days':
            startDate = format(subDays(today, 30), 'yyyy-MM-dd');
            endDate = format(today, 'yyyy-MM-dd');
            break;
          case 'month':
            startDate = format(startOfMonth(today), 'yyyy-MM-dd');
            endDate = format(endOfMonth(today), 'yyyy-MM-dd');
            break;
          case 'year':
            startDate = format(startOfYear(today), 'yyyy-MM-dd');
            endDate = format(endOfYear(today), 'yyyy-MM-dd');
            break;
          case 'custom':
            startDate = customStartDate;
            endDate = customEndDate;
            break;
          default:
            startDate = format(subDays(today, 7), 'yyyy-MM-dd');
            endDate = format(today, 'yyyy-MM-dd');
        }
      }
      
      try {
        // Request the export in the specified format
        const response = await axios.get(`http://localhost:5001/api/admin/reports/${reportType}/export`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            format: exportFormat,
            startDate,
            endDate
          },
          responseType: 'blob' // Important for file downloads
        });
        
        // Create a download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Format file name with current date
        const currentDate = format(new Date(), 'yyyy-MM-dd');
        link.setAttribute('download', `${reportType}-report-${currentDate}.${exportFormat}`);
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Report exported successfully as ${exportFormat.toUpperCase()}`);
      } catch (apiError) {
        if (apiError.response && apiError.response.status === 404) {
          toast.error(`Export feature for ${reportType} reports is not available in the current API version.`);
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(`Failed to export report: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Generate chart colors
  const generateChartColors = (count) => {
    const baseColors = [
      { bg: 'rgba(255, 99, 132, 0.5)', border: 'rgb(255, 99, 132)' },
      { bg: 'rgba(54, 162, 235, 0.5)', border: 'rgb(54, 162, 235)' },
      { bg: 'rgba(255, 206, 86, 0.5)', border: 'rgb(255, 206, 86)' },
      { bg: 'rgba(75, 192, 192, 0.5)', border: 'rgb(75, 192, 192)' },
      { bg: 'rgba(153, 102, 255, 0.5)', border: 'rgb(153, 102, 255)' },
      { bg: 'rgba(255, 159, 64, 0.5)', border: 'rgb(255, 159, 64)' },
    ];
    
    const colors = { bg: [], border: [] };
    
    for (let i = 0; i < count; i++) {
      const colorIndex = i % baseColors.length;
      colors.bg.push(baseColors[colorIndex].bg);
      colors.border.push(baseColors[colorIndex].border);
    }
    
    return colors;
  };

  // Render summary statistics
  const renderSummary = () => {
    if (!reportData || loading || !reportData.summary) return null;
    
    const { summary } = reportData;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(summary).map(([key, value], index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 uppercase">{key}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
    );
  };

  // Render different charts based on report type
  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="text-red-500 text-center max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{error}</p>
            {error.includes('not available') && (
              <button 
                onClick={() => setReportType('sales')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                View Sales Report Instead
              </button>
            )}
          </div>
        </div>
      );
    }
    
    if (!reportData || !reportData.labels || !reportData.data) {
      return <div className="h-96 flex items-center justify-center text-gray-500">No data available for the selected criteria</div>;
    }
    
    const labels = reportData.labels;
    const chartData = reportData.data;
    
    switch (reportType) {
      case 'sales':
        return (
          <div className="h-96">
            <Bar 
              data={{
                labels,
                datasets: [{
                  label: 'Daily Sales ($)',
                  data: chartData,
                  backgroundColor: 'rgba(54, 162, 235, 0.5)',
                  borderColor: 'rgb(54, 162, 235)',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `$${context.parsed.y.toFixed(2)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + value;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        );
        
      case 'products':
        const colors = generateChartColors(chartData.length);
        
        return (
          <div className="h-96">
            <Pie
              data={{
                labels,
                datasets: [{
                  label: 'Product Sales',
                  data: chartData,
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    align: 'start'
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        );
        
      case 'customers':
        return (
          <div className="h-96">
            <Line
              data={{
                labels,
                datasets: [{
                  label: 'New Customer Registrations',
                  data: chartData,
                  fill: true,
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  borderColor: 'rgb(75, 192, 192)',
                  tension: 0.2
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </div>
        );

      // Removed inventory case

      default:
        return <div className="h-96 flex items-center justify-center text-gray-500">Select a report type</div>;
    }
  };

  // Render the report data table
  const renderDataTable = () => {
    if (loading || !reportData || !reportData.columns || !reportData.rows) return null;
    
    if (reportData.rows.length === 0) {
      return (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md text-center text-gray-500">
          No data available for the selected time range
        </div>
      );
    }
    
    return (
      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {reportData.columns.map((column, index) => (
                <th 
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Get date range display text
  const getDateRangeText = () => {
    if (!reportData || !reportData.dateRange) return '';
    
    const { start, end } = reportData.dateRange;
    return `${start} to ${end}`;
  };

  return (
    <div className="px-6 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Reports</h1>
          {reportData?.dateRange && (
            <p className="text-sm text-gray-500 mt-1">
              Data from {getDateRangeText()}
            </p>
          )}
        </div>
        
        <div className="flex space-x-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isExporting || loading || !reportData}
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
          </select>
          
          <button
            onClick={handleExport}
            disabled={isExporting || loading || !reportData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              'Export Report'
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        {/* Report Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="sales">Sales Report</option>
              <option value="products">Product Performance</option>
              <option value="customers">Customer Acquisition</option>
              {/* Removed inventory option */}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {timeRange === 'custom' && (
            <div className="flex flex-col md:flex-row items-start md:items-end gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  max={format(new Date(), 'yyyy-MM-dd')}
                  disabled={loading}
                />
              </div>
              <button
                onClick={() => validateCustomDateRange()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                disabled={loading}
              >
                Apply
              </button>
            </div>
          )}
        </div>
        
        {/* Summary Statistics */}
        {renderSummary()}
        
        {/* Report Visualization */}
        {renderChart()}
        
        {/* Report Data Table */}
        {renderDataTable()}
      </div>
    </div>
  );
};

export default Reports;