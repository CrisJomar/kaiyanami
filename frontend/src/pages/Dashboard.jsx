import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user: authUser } = useAuth(); 
  
 
  const [profileFormData, setProfileFormData] = useState({
    firstName: '',
    lastName: ''
  });
  const [profileFormErrors, setProfileFormErrors] = useState({});
  
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressFormData, setAddressFormData] = useState({
    fullName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phoneNumber: '',
    isDefault: false
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  
  // Modal states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordFormErrors, setPasswordFormErrors] = useState({});
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  // Authentication and data fetching
  useEffect(() => {
    // Check auth status first
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Set user from auth context immediately
    if (authUser) {
      setUser(authUser);
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Fetch all data in parallel for better performance
        await Promise.all([
          // Fetch user data if we don't already have it from auth context
          !authUser ? fetchUserInfo(token) : Promise.resolve(),
          // Always fetch these items
          fetchOrders(token),
          fetchWishlist(token),
          fetchAddresses(token)
        ]);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
        // Don't redirect on data fetch errors, just show error message
        setError('Failed to load some dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate, isAuthenticated, authUser]);

  // Split the fetch functions for better error handling
  const fetchUserInfo = async (token) => {
    try {
      const userResponse = await axios.get('http://localhost:5001/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUser(userResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired or invalid
        navigate('/login');
      }
      throw error;
    }
  };

  const fetchOrders = async (token) => {
    try {
      const ordersResponse = await axios.get('http://localhost:5001/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setOrders(ordersResponse.data);
    } catch (error) {
      toast.error("Failed to load your orders");
      setOrders([]);
    }
  };

  const fetchWishlist = async (token) => {
    try {
      const wishlistResponse = await axios.get('http://localhost:5001/api/wishlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setWishlistItems(wishlistResponse.data);
    } catch (error) {
      setWishlistItems([]);
    }
  };

  const fetchAddresses = async (token) => {
    try {
      const addressesResponse = await axios.get('http://localhost:5001/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAddresses(addressesResponse.data || []);
    } catch (error) {
      setAddresses([]);
    }
  };

  // Address management functions
  const handleEditAddress = (address) => {
    setAddressFormData({
      fullName: address.fullName,
      address1: address.address1,
      address2: address.address2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phoneNumber: address.phoneNumber || '',
      isDefault: address.isDefault
    });
    setEditingAddress(address.id);
    setShowAddressModal(true);
  };
  
  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/addresses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAddresses(addresses.filter(address => address.id !== id));
      toast.success('Address deleted successfully');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };
  
  const handleSetDefaultAddress = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/addresses/${id}/default`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAddresses(addresses.map(address => ({
        ...address,
        isDefault: address.id === id
      })));
      
      toast.success('Default address updated');
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to update default address');
    }
  };
  

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' }
];

const handleAddressSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  // Validate form data
  const errors = {};
  if (!addressFormData.fullName.trim()) {
    errors.fullName = "Full name is required";
  }
  
  if (!addressFormData.address1.trim()) {
    errors.address1 = "Address is required";
  }
  
  if (!addressFormData.city.trim()) {
    errors.city = "City is required";
  }
  
  if (!addressFormData.state) {
    errors.state = "State is required";
  }
  
  if (!addressFormData.postalCode.trim()) {
    errors.postalCode = "Postal code is required";
  } else if (!/^\d{5}(-\d{4})?$/.test(addressFormData.postalCode.trim())) {
    errors.postalCode = "Invalid postal code format (e.g. 12345 or 12345-6789)";
  }
  
  if (!addressFormData.country.trim()) {
    errors.country = "Country is required";
  }
  
  if (addressFormData.phoneNumber && !/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im.test(addressFormData.phoneNumber.trim())) {
    errors.phoneNumber = "Invalid phone number format";
  }
  
  setFormErrors(errors);
  
  if (Object.keys(errors).length > 0) {
    setIsSubmitting(false);
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    
    if (editingAddress) {

      await axios.put(`http://localhost:5001/api/addresses/${editingAddress}`, addressFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAddresses(addresses.map(address => 
        address.id === editingAddress ? { ...address, ...addressFormData } : address
      ));
      
      toast.success('Address updated successfully');
    } else {
      const response = await axios.post('http://localhost:5001/api/addresses', addressFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAddresses([...addresses, response.data]);
      
      toast.success('Address added successfully');
    }
    

    setShowAddressModal(false);
    setEditingAddress(null);
    setFormErrors({});
  } catch (error) {
    console.error('Error saving address:', error);
    toast.error('Failed to save address');
  } finally {
    setIsSubmitting(false);
  }
};

const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must include at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must include at least one special character (!@#$%^&*)');
  }
  
  return errors;
};

const handlePasswordChange = (e) => {
  const { name, value } = e.target;
  setPasswordFormData({
    ...passwordFormData,
    [name]: value
  });
  
  if (passwordFormErrors[name]) {
    setPasswordFormErrors({
      ...passwordFormErrors,
      [name]: ''
    });
  }
};

//function for real-time validation
const validateAddressField = (name, value) => {
  let error = '';
  
  switch (name) {
    case 'fullName':
      if (!value.trim()) {
        error = "Full name is required";
      } else if (!/^[a-zA-Z\s.'-]{2,}$/.test(value.trim())) {
        error = "Please enter a valid name";
      }
      break;
      
    case 'address1':
      if (!value.trim()) {
        error = "Address is required";
      } else if (value.trim().length < 5) {
        error = "Address seems too short";
      }
      break;
      
    case 'city':
      if (!value.trim()) {
        error = "City is required";
      } else if (!/^[a-zA-Z\s.-]{2,}$/.test(value.trim())) {
        error = "Please enter a valid city name";
      }
      break;
      
    case 'state':
      if (!value) {
        error = "State is required";
      }
      break;
      
    case 'postalCode':
      if (!value.trim()) {
        error = "Postal code is required";
      } else if (!/^\d{5}(-\d{4})?$/.test(value.trim())) {
        error = "Format: 12345 or 12345-6789";
      }
      break;
      
    case 'country':
      if (!value.trim()) {
        error = "Country is required";
      }
      break;
      
    case 'phoneNumber':
      if (value && !/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\\s.-]?\d{4}$/.test(value.trim())) {
        error = "Format: (123) 456-7890 or 123-456-7890";
      }
      break;
      
    default:
      break;
  }
  
  return error;
};

// function to handle address form input
const handleAddressChange = (e) => {
  const { name, value, type, checked } = e.target;
  const fieldValue = type === 'checkbox' ? checked : value;
  
  // Update form data
  setAddressFormData(prev => ({
    ...prev,
    [name]: fieldValue
  }));
  
  // Real-time validation
  if (type !== 'checkbox') {
    const error = validateAddressField(name, value);
    
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }
};

const fetchOrderDetails = async (orderId) => {
  try {
    setLoadingOrderDetails(true);
    const token = localStorage.getItem('token');
    const response = await axios.get(`http://localhost:5001/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setSelectedOrder(response.data);
    setActiveTab("orderDetail");
  } catch (error) {
    console.error("Error fetching order details:", error);
    toast.error("Could not load order details. Please try again.");
  } finally {
    setLoadingOrderDetails(false);
  }
};

// Add this function after your other handler functions
const validateProfileField = (name, value) => {
  let error = '';
  
  switch (name) {
    case 'firstName':
      if (value && (value.length < 2 || value.length > 30)) {
        error = "First name must be between 2 and 30 characters";
      } else if (value && !/^[a-zA-Z\s'-]+$/.test(value)) {
        error = "First name can only contain letters, spaces, hyphens, and apostrophes";
      }
      break;
      
    case 'lastName':
      if (value && (value.length < 2 || value.length > 30)) {
        error = "Last name must be between 2 and 30 characters";
      } else if (value && !/^[a-zA-Z\s'-]+$/.test(value)) {
        error = "Last name can only contain letters, spaces, hyphens, and apostrophes";
      }
      break;
      
    default:
      break;
  }
  
  return error;
};

// Add the profile change handler
const handleProfileChange = (e) => {
  const { name, value } = e.target;
  
  // Update form data
  setProfileFormData(prevState => ({
    ...prevState,
    [name]: value
  }));
  
  // Validate the field
  const error = validateProfileField(name, value);
  
  // Update errors state
  setProfileFormErrors(prevErrors => ({
    ...prevErrors,
    [name]: error
  }));
};

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 mt-16"> 
      <div className="mb-6 border-b flex space-x-1">
        <button 
          className={`px-4 py-2 ${activeTab === "overview" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === "orders" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("orders")}
        >
          Orders
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === "profile" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === "addresses" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("addresses")}
        >
          Addresses
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Wishlist Items</h3>
            <span className="text-pink-500 bg-pink-100 rounded-full w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold mt-4">{wishlistItems.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Member Since</h3>
            <span className="text-green-500 bg-green-100 rounded-full w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <p className="text-xl font-bold mt-4">
            {user?.createdAt 
              ? new Date(user.createdAt).toLocaleDateString() 
              : 'N/A'
            }
          </p>
        </div>




                  
                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <button 
                        onClick={() => navigate('/products')}
                        className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                          <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Browse Products</span>
                      </button>
                      
                      <button 
                        onClick={() => setShowWishlist(true)}
                        className="flex flex-col items-center justify-center p-4 bg-pink-50 rounded-lg hover:bg-pink-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">View Wishlist</span>
                      </button>
                      
                      <button 
                        onClick={() => navigate('/cart')}
                        className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                        </svg>
                        <span className="text-sm font-medium">View Cart</span>
                      </button>
                      
                      <button 
                        onClick={() => setShowEditProfileModal(true)}
                        className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Edit Profile</span>
                      </button>
                    </div>
                  </div>






                  
            {/* Recent Orders */}
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-800">Recent Orders</h3>
                            <button 
                              onClick={() => setActiveTab("orders")}
                              className="text-blue-500 hover:underline text-sm font-medium"
                            >
                              View All
                            </button>
                          </div>
                          
                          {orders.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500">ID</th>
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500">Date</th>
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500">Total</th>
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orders.slice(0, 3).map(order => (
                                    <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                                      <td className="px-4 py-3 text-sm font-medium text-blue-600">#{order.id.substring(0, 8)}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                                      <td className="px-4 py-3 text-sm font-medium">${order.total?.toFixed(2) || '0.00'}</td>
                                      <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {order.status || 'Processing'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        <button 
                                          onClick={() => fetchOrderDetails(order.id)}
                                          className="text-sm text-blue-500 hover:text-blue-700"
                                        >
                                          View Details
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">No orders yet</p>
                          )}
                        </div>
                      </div>
      
                   {/* Orders Tab Content */}
             {activeTab === "orders" && (
                <div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800">All Orders</h3>
                      <div className="text-sm text-gray-500">
                        Total: {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                      </div>
                    </div>
                    
                    {orders.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-sm font-medium text-gray-500">Order ID</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-500">Date</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-500">Total</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-500">Status</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(order => (
                              <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-blue-600">#{order.id.substring(0, 8)}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-sm font-medium">${order.total ? order.total.toFixed(2) : '0.00'}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {order.status || 'Processing'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <button 
                                    onClick={() => fetchOrderDetails(order.id)}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                        <button 
                          onClick={() => navigate('/products')}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Browse Products
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

{/* Order Detail Tab Content */}
{activeTab === "orderDetail" && selectedOrder && (
  <div>
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Order #{selectedOrder.id.substring(0, 8)}</h2>
          <p className="text-sm text-gray-600">Placed on: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
        </div>
        <button
          onClick={() => setActiveTab("orders")}
          className="text-blue-500 hover:underline text-sm font-medium flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </button>
      </div>
      
      <div className="border-b pb-4 mb-4">
        <div className="flex justify-between mb-4">
          <div>
            <h3 className="font-medium text-gray-800">Order Status</h3>
            <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
              selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' : 
              selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {selectedOrder.status || 'Processing'}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Payment Status</h3>
            <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
              selectedOrder.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 
              selectedOrder.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {selectedOrder.paymentStatus || 'Awaiting'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Order Items */}
      <h3 className="font-medium text-gray-800 mb-3">Order Items</h3>
      <div className="space-y-4 mb-6">
        {selectedOrder.orderItems && selectedOrder.orderItems.map((item) => (
          <div key={item.id} className="flex border border-gray-200 rounded-md overflow-hidden">
            <div className="w-20 h-20 flex-shrink-0">
              {item.product?.imageUrl ? (
                <img src={item.product.imageUrl} alt={item.product?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs text-gray-500">No Image</span>
                </div>
              )}
            </div>
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-800">{item.product?.name || 'Product'}</h4>
                {item.size && <p className="text-xs text-gray-600">Size: {item.size}</p>}
                <div className="flex justify-between mt-1">
                  <p className="text-sm text-gray-600">${item.price?.toFixed(2) || '0.00'} × {item.quantity}</p>
                  <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Shipping Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-medium text-gray-800 mb-2">Shipping Information</h3>
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            {selectedOrder.shippingAddress ? (
              <>
                <p>{selectedOrder.shippingAddress.street}</p>
                <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                <p>{selectedOrder.shippingAddress.country || 'US'}</p>
              </>
            ) : selectedOrder.guestShippingStreet ? (
              <>
                <p>{selectedOrder.guestShippingStreet}</p>
                <p>{selectedOrder.guestShippingCity}, {selectedOrder.guestShippingState} {selectedOrder.guestShippingZipCode}</p>
                <p>{selectedOrder.guestShippingCountry || 'US'}</p>
              </>
            ) : (
              <p className="text-gray-500">No shipping information available</p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-800 mb-2">Payment Information</h3>
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            {selectedOrder.payment ? (
              <>
                <p>Method: {selectedOrder.payment.paymentMethod || 'Unknown'}</p>
                <p className="text-gray-600">Amount: ${selectedOrder.payment.amount?.toFixed(2) || '0.00'}</p>
                <p className="text-gray-600">Status: {selectedOrder.payment.status || 'Unknown'}</p>
              </>
            ) : (
              <p className="text-gray-500">No payment information available</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Order Summary */}
      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-800 mb-3">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <p className="text-gray-600">Subtotal</p>
            <p>${selectedOrder.subtotal?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Tax</p>
            <p>${selectedOrder.tax?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Shipping</p>
            <p>${selectedOrder.shipping?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="flex justify-between font-medium text-lg border-t pt-2 mt-2">
            <p>Total</p>
            <p>${selectedOrder.total?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

{activeTab === "orderDetail" && loadingOrderDetails && (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
)}




                {/* Profile Tab Content */}
                {activeTab === "profile" && (
                <div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Your Profile</h2>
                    <div>
                      <div className="flex flex-col sm:flex-row items-center sm:items-start mb-6">
                        <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 sm:mb-0 sm:mr-6">
                          {user?.firstName?.[0]}{user?.lastName?.[0] || ''}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">
                            {user?.firstName ? user.firstName : 'Not set'} {user?.lastName ? user.lastName : 'Not set'}
                          </h3>
                          <p className="text-gray-600">{user?.email}</p>
                          <p className="text-sm text-gray-500 mt-1">Member since: {user?.createdAt ? new Date(user?.createdAt).toLocaleDateString() : "N/A"}</p>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">First Name</label>
                            <p className="mt-1 text-gray-900">{user?.firstName || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Last Name</label>
                            <p className="mt-1 text-gray-900">{user?.lastName || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <p className="mt-1 text-gray-900">{user?.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-4">
                          <button 
                            onClick={() => {
                              // Initialize form data with current user data
                              setProfileFormData({
                                firstName: user?.firstName || '',
                                lastName: user?.lastName || ''
                              });
                              setShowEditProfileModal(true);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Edit Profile
                          </button>
                          
                          <button 
                            onClick={() => setShowPasswordModal(true)}
                            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                          >
                            Change Password
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}




{/* Address Book Tab Content */}
{activeTab === "addresses" && (
  <div>
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Your Addresses</h2>
        <button
          onClick={() => {
            setEditingAddress(null);
            setAddressFormData({
              fullName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '',
              address1: '',
              address2: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
              phoneNumber: '',
              isDefault: false
            });
            setShowAddressModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Address
        </button>
      </div>
      
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`border ${address.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-md p-4`}
            >
              <div className="flex justify-between mb-2">
                <div className="font-medium">{address.fullName}</div>
                {address.isDefault && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                    Default
                  </span>
                )}
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p>{address.address1}</p>
                {address.address2 && <p>{address.address2}</p>}
                <p>{address.city}, {address.state} {address.postalCode}</p>
                <p>{address.country}</p>
                {address.phoneNumber && <p>Phone: {address.phoneNumber}</p>}
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefaultAddress(address.id)}
                    className="text-xs text-gray-600 hover:text-blue-500 px-2 py-1 border border-gray-300 rounded-md"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleEditAddress(address)}
                  className="text-xs text-gray-600 hover:text-blue-500 px-2 py-1 border border-gray-300 rounded-md"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteAddress(address.id)}
                  className="text-xs text-red-600 hover:text-red-700 px-2 py-1 border border-red-300 rounded-md"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-gray-500">You haven't added any addresses yet</p>
          <button
            onClick={() => {
              setEditingAddress(null);
              setAddressFormData({
                fullName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '',
                address1: '',
                address2: '',
                city: '',
                state: '',
                postalCode: '',
                country: '',
                phoneNumber: '',
                isDefault: false
              });
              setShowAddressModal(true);
            }}
            className="mt-4 text-blue-500 underline"
          >
            Add your first address
          </button>
        </div>
      )}
      
      <div className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-500">
          Saved addresses can be selected during checkout for faster shopping.
        </p>
      </div>
    </div>
  </div>
)}



      {/* Edit Profile Modal */}
{showEditProfileModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Edit Profile</h3>
        <button
          onClick={() => {
            setShowEditProfileModal(false);
            setProfileFormErrors({});
          }}
          className="text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
        >
          &times;
        </button>
      </div>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        

        if (Object.values(profileFormErrors).some(error => error)) {
          return; 
        }
        
        if (!profileFormData.firstName?.trim() && !profileFormData.lastName?.trim()) {
          setProfileFormErrors({
            form: 'Please enter at least one field to update'
          });
          return;
        }
        
        const token = localStorage.getItem('token');
        fetch(`http://localhost:5001/api/auth/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(profileFormData)
        })
        .then(res => {
          console.log("Profile update response status:", res.status);
          if (!res.ok) throw new Error('Failed to update profile');
          return res.json();
        })
        .then(data => {
          console.log("Profile update successful, received:", data);
  
          setUser({...user, ...profileFormData});
          
          localStorage.setItem('userProfileName', JSON.stringify({
            firstName: profileFormData.firstName,
            lastName: profileFormData.lastName
          }));
          
          toast.success('Profile updated successfully');
          setShowEditProfileModal(false);
          setProfileFormErrors({});
        })
        .catch(err => {
          console.error("Error updating profile:", err);
          setProfileFormErrors({
            form: 'Failed to update profile. Please try again.'
          });
        });
      }}>
        
        {/* General form error */}
        {profileFormErrors.form && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {profileFormErrors.form}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="firstName">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={profileFormData.firstName || user?.firstName || ''}
              onChange={handleProfileChange}
              className={`w-full px-3 py-2 border ${
                profileFormErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder="Enter your first name"
            />
            {profileFormErrors.firstName && (
              <p className="mt-1 text-xs text-red-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {profileFormErrors.firstName}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lastName">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={profileFormData.lastName || user?.lastName || ''}
              onChange={handleProfileChange}
              className={`w-full px-3 py-2 border ${
                profileFormErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder="Enter your last name"
            />
            {profileFormErrors.lastName && (
              <p className="mt-1 text-xs text-red-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {profileFormErrors.lastName}
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setShowEditProfileModal(false);
              setProfileFormErrors({});
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={Object.values(profileFormErrors).some(error => error)}
            className={`px-4 py-2 bg-blue-500 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              Object.values(profileFormErrors).some(error => error) 
                ? 'opacity-70 cursor-not-allowed' 
                : 'hover:bg-blue-600'
            } focus:outline-none`}
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      
      {/* Change Password Modal */}
      {showPasswordModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Change Password</h3>
        <button
          onClick={() => {
            setShowPasswordModal(false);
            setPasswordFormData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
            setPasswordFormErrors({});
            setPasswordChangeSuccess(false);
          }}
          className="text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
        >
          &times;
        </button>
      </div>
      
      {passwordChangeSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Password updated successfully!
        </div>
      )}
      
      {Object.keys(passwordFormErrors).length > 0 && !passwordFormErrors._global && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Please fix the following errors:</p>
          <ul className="list-disc list-inside">
            {Object.values(passwordFormErrors).map((error, index) => (
              error && <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {passwordFormErrors._global && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {passwordFormErrors._global}
        </div>
      )}
      
      <form onSubmit={async (e) => {
        e.preventDefault();
        
        // Reset errors
        setPasswordFormErrors({});
        
        // Validate
        const errors = {};
        
        if (!passwordFormData.currentPassword) {
          errors.currentPassword = 'Current password is required';
        }
        
        if (!passwordFormData.newPassword) {
          errors.newPassword = 'New password is required';
        } else {
          // Check password strength
          const passwordErrors = validatePassword(passwordFormData.newPassword);
          if (passwordErrors.length > 0) {
            errors.newPassword = passwordErrors[0]; // Show first error
          }
        }
        
        if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
          errors.confirmPassword = 'New passwords do not match';
        }
        
        if (Object.keys(errors).length > 0) {
          setPasswordFormErrors(errors);
          return;
        }
        
        setIsPasswordSubmitting(true);
        
       
        try {
          const token = localStorage.getItem('token');
          
          // Add better error handling
          if (!token) {
            throw new Error('Authentication token missing. Please log in again.');
          }
          
          const response = await axios.post(`http://localhost:5001/api/auth/change-password`, passwordFormData, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Success handling stays the same
          setPasswordChangeSuccess(true);
          
          // Reset form
          setPasswordFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          
          // Close modal after success
          setTimeout(() => {
            setShowPasswordModal(false);
            setPasswordChangeSuccess(false);
          }, 2000);
          
        } catch (err) {
          console.error('Error updating password:', err);
          
          // Better error message extraction from axios errors
          const errorMessage = err.response?.data?.message || 
                              'Failed to update password. Please verify your current password and try again.';
          
          setPasswordFormErrors({
            _global: errorMessage
          });
        } finally {
          setIsPasswordSubmitting(false);
        }
      }}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentPassword">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordFormData.currentPassword}
              onChange={handlePasswordChange}
              className={`w-full px-3 py-2 border ${
                passwordFormErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              disabled={isPasswordSubmitting}
              required
            />
            {passwordFormErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordFormErrors.currentPassword}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordFormData.newPassword}
              onChange={handlePasswordChange}
              className={`w-full px-3 py-2 border ${
                passwordFormErrors.newPassword ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              disabled={isPasswordSubmitting}
              required
            />
            {passwordFormErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordFormErrors.newPassword}</p>
            )}
            <div className="mt-1 text-xs text-gray-500">
              Password must be at least 8 characters with uppercase, lowercase, number, and special character
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordFormData.confirmPassword}
              onChange={handlePasswordChange}
              className={`w-full px-3 py-2 border ${
                passwordFormErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              disabled={isPasswordSubmitting}
              required
            />
            {passwordFormErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordFormErrors.confirmPassword}</p>
            )}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setShowPasswordModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={isPasswordSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 ${isPasswordSubmitting ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none`}
            disabled={isPasswordSubmitting}
          >
            {isPasswordSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </span>
            ) : (
              'Update Password'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Wishlist Modal */}
      {showWishlist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Your Wishlist</h3>
              <button
                onClick={() => setShowWishlist(false)}
                className="text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
              >
                &times;
              </button>
            </div>
            
            {wishlistItems.length > 0 ? (
              <div className="space-y-4">
                {wishlistItems.map(item => (
                  <div key={item.id} className="flex border border-gray-200 rounded-md overflow-hidden">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-600">${item.price ? item.price.toFixed(2) : '0.00'}</p>
                      </div>
                      <div className="flex space-x-2 mt-2">
                        <button 
                          onClick={() => {
                            alert(`${item.name} added to cart!`);
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Add to Cart
                        </button>
                        <button 
                          onClick={() => {
                            // wishlist item removal logic here
                          }}
                          className="px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      //  "add all to cart" logic here
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Add All to Cart
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-600 mb-4">Your wishlist is empty</p>
                <button 
                  onClick={() => setShowWishlist(false)} 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Browse Products
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddressSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fullName">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={addressFormData.fullName}
                    onChange={handleAddressChange}
                    className={`w-full px-3 py-2 border ${formErrors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    required
                  />
                  {formErrors.fullName && (
                    <p className="mt-1 text-xs text-red-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {formErrors.fullName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address1">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address1"
                    name="address1"
                    value={addressFormData.address1}
                    onChange={handleAddressChange}
                    className={`w-full px-3 py-2 border ${formErrors.address1 ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    required
                  />
                  {formErrors.address1 && (
                    <p className="mt-1 text-xs text-red-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {formErrors.address1}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    id="address2"
                    name="address2"
                    value={addressFormData.address2}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={addressFormData.city}
                      onChange={handleAddressChange}
                      className={`w-full px-3 py-2 border ${formErrors.city ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      required
                    />
                    {formErrors.city && (
                      <p className="mt-1 text-xs text-red-500 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {formErrors.city}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="state">
                      State/Province <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="state"
                      name="state"
                      value={addressFormData.state}
                      onChange={handleAddressChange}
                      className={`w-full px-3 py-2 border ${formErrors.state ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      required
                    >
                      <option value="">Select a state</option>
                      {US_STATES.map(state => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.state && (
                      <p className="mt-1 text-xs text-red-500 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {formErrors.state}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="postalCode">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={addressFormData.postalCode}
                      onChange={handleAddressChange}
                      className={`w-full px-3 py-2 border ${formErrors.postalCode ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="12345"
                      required
                    />
                    {formErrors.postalCode && (
                      <p className="mt-1 text-xs text-red-500 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {formErrors.postalCode}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="country">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={addressFormData.country}
                      onChange={handleAddressChange}
                      className={`w-full px-3 py-2 border ${formErrors.country ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      required
                    />
                    {formErrors.country && (
                      <p className="mt-1 text-xs text-red-500 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {formErrors.country}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phoneNumber">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={addressFormData.phoneNumber}
                    onChange={handleAddressChange}
                    className={`w-full px-3 py-2 border ${formErrors.phoneNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {formErrors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {formErrors.phoneNumber}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={addressFormData.isDefault}
                    onChange={handleAddressChange}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-700" htmlFor="isDefault">
                    Set as default address
                  </label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Object.values(formErrors).some(error => error)}
                  className={`px-4 py-2 bg-blue-500 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isSubmitting || Object.values(formErrors).some(error => error) 
                      ? 'opacity-70 cursor-not-allowed' 
                      : 'hover:bg-blue-600'
                  } focus:outline-none`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    editingAddress ? 'Update Address' : 'Save Address'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;