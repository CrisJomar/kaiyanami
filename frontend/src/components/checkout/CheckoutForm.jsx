import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const CheckoutForm = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useShopContext(); // Remove the non-existent calculateCartTotal
  const { user } = useAuth(); // Get current logged in user
  
  // Calculate cart total directly in the component
  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => 
      sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
    const shipping = subtotal >= 100 ? 0 : 10;
    const tax = subtotal * 0.115; // 
    return subtotal + shipping + tax;
  }, [cart]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    saveInfo: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phoneNumber: '',
    saveAddress: false
  });
  
  // Auto-populate form fields if user is logged in
  useEffect(() => {
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        // Fill in form data from user info if available
        name: user.name || 
              (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') || 
              prevData.name,
        email: user.email || prevData.email,
        phone: user.phone || prevData.phone,
        address: user.address?.street || user.address || prevData.address,
        city: user.address?.city || user.city || prevData.city,
        state: user.address?.state || user.state || prevData.state,
        zip: user.address?.zip || user.zip || prevData.zip
      }));
      
      console.log('Form pre-filled with user data:', user);
    }
  }, [user]);

  // Add to your useEffect section
  useEffect(() => {
    const fetchAddresses = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      setLoadingAddresses(true);
      try {
        const response = await axios.get('http://localhost:5001/api/addresses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSavedAddresses(response.data || []);
        
        // Pre-select default address if available
        const defaultAddress = response.data?.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          // Fill form with default address
          setFormData({
            ...formData,
            address: defaultAddress.address1,
            city: defaultAddress.city,
            state: defaultAddress.state,
            zip: defaultAddress.postalCode
          });
        }
      } catch (error) {
        console.error('Failed to fetch addresses:', error);
      } finally {
        setLoadingAddresses(false);
      }
    };
    
    fetchAddresses();
  }, []);


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors(prevErrors => ({
      ...prevErrors,
      [name]: validateField(name, value)
    }));
  };


  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };
  
  
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return value.trim() === '' ? 'Name is required' : 
               value.trim().length < 3 ? 'Name must be at least 3 characters' : '';
      
      case 'email':
        return value.trim() === '' ? 'Email is required' : 
               !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email format' : '';
      
      case 'phone':
        return value.trim() !== '' && !/^[0-9\-\+\(\)\s]{10,15}$/.test(value) ? 
               'Invalid phone number' : '';
      
      case 'address':
        return value.trim() === '' ? 'Address is required' : 
               value.trim().length < 5 ? 'Please enter complete address' : '';
      
      case 'city':
        return value.trim() === '' ? 'City is required' : '';
      
      case 'state':
        return value.trim() === '' ? 'State is required' : 
               value.trim().length < 2 ? 'Invalid state format' : '';
      
      case 'zip':
        return value.trim() === '' ? 'ZIP code is required' : 
               !/^\d{5}(-\d{4})?$/.test(value) ? 'Invalid ZIP code' : '';
      
      case 'cardNumber':
     
        const cardNum = value.replace(/\s/g, '');
        return cardNum === '' ? 'Card number is required' : 
               !/^\d{16}$/.test(cardNum) ? 'Card number must be 16 digits' : '';
      
      case 'cardExpiry':
        if (value.trim() === '') return 'Expiry date is required';
      
        if (!/^\d{2}\/\d{2}$/.test(value)) return 'Use MM/YY format';
        
        const [month, year] = value.split('/');
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const expiryYear = parseInt(year, 10) + 2000;
        const expiryMonth = parseInt(month, 10);
        
        if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
          return 'Card has expired';
        }
        
        return '';
      
      case 'cardCvc':
        return value.trim() === '' ? 'CVC is required' : 
               !/^\d{3}$/.test(value) ? 'CVC must be 3 digits' : '';
      
      default:
        return '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
  
    if (formData.phone.trim() && !/^[0-9\-\+\(\)\s]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
   
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Please enter a complete address';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    } else if (formData.state.trim().length < 2) {
      newErrors.state = 'Please enter a valid state';
    }
    
    if (!formData.zip.trim()) {
      newErrors.zip = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zip)) {
      newErrors.zip = 'Please enter a valid ZIP code (e.g. 90210 or 90210-1234)';
    }
    
    // Validate payment information
    const cardNum = formData.cardNumber.replace(/\s/g, '');
    if (!cardNum) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!/^\d{16}$/.test(cardNum)) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }
    
    if (!formData.cardExpiry.trim()) {
      newErrors.cardExpiry = 'Expiration date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(formData.cardExpiry)) {
      newErrors.cardExpiry = 'Please use MM/YY format';
    } else {

      const [month, year] = formData.cardExpiry.split('/');
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const expiryYear = parseInt(year, 10) + 2000;
      const expiryMonth = parseInt(month, 10);
      
      if (expiryMonth < 1 || expiryMonth > 12) {
        newErrors.cardExpiry = 'Invalid month';
      } else if (expiryYear < currentYear || 
                (expiryYear === currentYear && expiryMonth < currentMonth)) {
        newErrors.cardExpiry = 'Card has expired';
      }
    }
    
    if (!formData.cardCvc.trim()) {
      newErrors.cardCvc = 'Security code is required';
    } else if (!/^\d{3}$/.test(formData.cardCvc)) {
      newErrors.cardCvc = 'CVC must be a 3-digit number';
    }
    
    return newErrors;
  };

  const isFormValid = () => {
    const currentErrors = validateForm();
    return Object.keys(currentErrors).length === 0;
  };


  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\s/g, ''); 
    value = value.replace(/\D/g, ''); 
    
 
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedValue += ' ';
      }
      formattedValue += value[i];
    }
   
    formattedValue = formattedValue.substring(0, 19);
    
    setFormData(prevData => ({
      ...prevData,
      cardNumber: formattedValue
    }));
    setErrors(prevErrors => ({
      ...prevErrors,
      cardNumber: validateField('cardNumber', formattedValue)
    }));
  };
  
  // Format card expiry as MM/YY
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format as MM/YY
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    
    value = value.substring(0, 5);
    
    setFormData(prevData => ({
      ...prevData,
      cardExpiry: value
    }));
    setErrors(prevErrors => ({
      ...prevErrors,
      cardExpiry: validateField('cardExpiry', value)
    }));
  };
  
  // Calculate subtotal separately for display
  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0),
  [cart]);
  
  const tax = subtotal * 0.115;
  const shipping = subtotal >= 100 ? 0 : 10;
  
  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      const { currentUser, isAuthenticated } = useAuth();
      console.log("Checkout auth status:", isAuthenticated, currentUser?.id || "guest");
      
      // Get token from localStorage for auth header
      const token = localStorage.getItem('token');
      
      // Prepare order data
      const orderData = {
        // If authenticated, don't need customer info (backend will use user data)
        // If not authenticated, include customer info from form
        customer: !isAuthenticated ? {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        } : null,
        
        shipping: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country || 'US',
          method: formData.shippingMethod
        },
        
        // Cart items
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          size: item.size
        })),
        
        // Payment details (from Stripe or your payment processor)
        payment: {
          method: 'stripe',
          intentId: 'mock-payment-intent-' + Date.now()
        }
      };
      
    

      const response = await axios.post(
        'http://localhost:5001/api/orders/create-order',
        orderData,
        {
          headers: token ? { 
            'Authorization': `Bearer ${token}` 
          } : {}
        }
      );
      
      if (response.data.success) {
        // Handle successful order
        navigate(`/order-confirmation/${response.data.orderId}`);
      } else {
        setError('Something went wrong with your order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.response?.data?.message || 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 mb-6 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>
            
            {/* Customer Info */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-medium mb-3">Customer Information</h3>
              
              <div>
                <label htmlFor="name" className="block text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded-md px-4 py-2 focus:ring-2 focus:outline-none ${
                    touched.name && errors.name 
                      ? 'border-red-500 focus:ring-red-200' 
                      : touched.name 
                      ? 'border-green-500 focus:ring-green-200' 
                      : 'border-gray-300 focus:ring-blue-200'
                  }`}
                  required
                />
                {touched.name && errors.name && 
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded-md px-4 py-2 focus:ring-2 focus:outline-none ${
                    touched.email && errors.email 
                      ? 'border-red-500 focus:ring-red-200' 
                      : touched.email 
                      ? 'border-green-500 focus:ring-green-200' 
                      : 'border-gray-300 focus:ring-blue-200'
                  }`}
                  required
                />
                {touched.email && errors.email && 
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-gray-700 mb-1">Phone Number (optional)</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded-md px-4 py-2 focus:ring-2 focus:outline-none ${
                    touched.phone && errors.phone 
                      ? 'border-red-500 focus:ring-red-200'
                      : touched.phone && formData.phone
                      ? 'border-green-500 focus:ring-green-200'
                      : 'border-gray-300 focus:ring-blue-200'
                  }`}
                />
                {touched.phone && errors.phone && 
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>
            
            {/* Saved Addresses Selector */}
            {localStorage.getItem('token') && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Your Saved Addresses</h3>
                
                {loadingAddresses ? (
                  <div className="flex items-center text-gray-500">
                    <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full mr-2"></div>
                    Loading addresses...
                  </div>
                ) : savedAddresses && savedAddresses.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    {savedAddresses.map((address) => (
                      <div 
                        key={address.id}
                        className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                          selectedAddressId === address.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedAddressId(address.id);
                          // Fill in form with address data
                          setFormData({
                            ...formData,
                            address: address.address1,
                            city: address.city,
                            state: address.state,
                            zip: address.postalCode
                          });
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{address.fullName}</div>
                            <div className="text-sm text-gray-600">{address.address1}</div>
                            <div className="text-sm text-gray-600">
                              {address.city}, {address.state} {address.postalCode}
                            </div>
                          </div>
                          {address.isDefault && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">You don't have any saved addresses.</p>
                )}
              </div>
            )}
            
            {/* Shipping Address */}
            <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
            <div className="space-y-4 mb-6">

              {savedAddresses && savedAddresses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-medium mb-3">Your Saved Addresses</h3>
                  
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    {savedAddresses.map((address) => (
                      <div 
                        key={address.id}
                        className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                          selectedAddressId === address.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedAddressId(address.id);
                          setShippingInfo({
                            fullName: address.fullName,
                            address1: address.address1,
                            address2: address.address2 || '',
                            city: address.city,
                            state: address.state,
                            postalCode: address.postalCode,
                            country: address.country,
                            phoneNumber: address.phoneNumber || ''
                          });
                        }}
                      >
                        <div className="flex justify-between">
                          <div className="font-medium">{address.fullName}</div>
                          {address.isDefault && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {address.address1}, {address.city}, {address.state} {address.postalCode}
                        </div>
                      </div>
                    ))}
                    
                    <div
                      className="p-3 text-blue-600 cursor-pointer hover:bg-gray-50 flex items-center"
                      onClick={() => {
                        setSelectedAddressId(null);
                        setShippingInfo({
                          fullName: '',
                          address1: '',
                          address2: '',
                          city: '',
                          state: '',
                          postalCode: '',
                          country: '',
                          phoneNumber: ''
                        });
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Use a different address
                    </div>
                  </div>
                </div>
              )}

              {loadingAddresses && (
                <div className="text-center py-4">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="mt-2 text-gray-500">Loading your saved addresses...</p>
                </div>
              )}

              {/* Add a save address checkbox if the user is logged in */}
              {localStorage.getItem('token') && !selectedAddressId && (
                <div className="mb-6 mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded"
                      checked={shippingInfo.saveAddress}
                      onChange={(e) => setShippingInfo({
                        ...shippingInfo,
                        saveAddress: e.target.checked
                      })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Save this address for future orders</span>
                  </label>
                </div>
              )}
              <div>
                <label htmlFor="address" className="block text-gray-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded-md px-4 py-2 ${touched.address && errors.address ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
                {touched.address && errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full border rounded-md px-4 py-2 ${touched.city && errors.city ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {touched.city && errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>
                
                <div>
                  <label htmlFor="state" className="block text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full border rounded-md px-4 py-2 ${touched.state && errors.state ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {touched.state && errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>
              </div>
              
              <div>
                <label htmlFor="zip" className="block text-gray-700 mb-1">ZIP Code *</label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded-md px-4 py-2 ${touched.zip && errors.zip ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
                {touched.zip && errors.zip && <p className="text-red-500 text-sm mt-1">{errors.zip}</p>}
              </div>
            </div>
            
            {/* Payment Info */}
            <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="cardNumber" className="block text-gray-700 mb-1">Card Number *</label>
                <input
                  type="text"
                  id="cardNumber"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleCardNumberChange}
                  onBlur={handleBlur}
                  placeholder="1234 5678 9012 3456"
                  className={`w-full border rounded-md px-4 py-2 ${touched.cardNumber && errors.cardNumber ? 'border-red-500' : 'border-gray-300'}`}
                  required
                  maxLength="19"
                />
                {touched.cardNumber && errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cardExpiry" className="block text-gray-700 mb-1">Expiry Date *</label>
                  <input
                    type="text"
                    id="cardExpiry"
                    name="cardExpiry"
                    value={formData.cardExpiry}
                    onChange={handleExpiryChange}
                    onBlur={handleBlur}
                    placeholder="MM/YY"
                    className={`w-full border rounded-md px-4 py-2 ${touched.cardExpiry && errors.cardExpiry ? 'border-red-500' : 'border-gray-300'}`}
                    required
                    maxLength="5"
                  />
                  {touched.cardExpiry && errors.cardExpiry && <p className="text-red-500 text-sm mt-1">{errors.cardExpiry}</p>}
                </div>
                
                <div>
                  <label htmlFor="cardCvc" className="block text-gray-700 mb-1">CVC *</label>
                  <input
                    type="text"
                    id="cardCvc"
                    name="cardCvc"
                    value={formData.cardCvc}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="123"
                    className={`w-full border rounded-md px-4 py-2 ${touched.cardCvc && errors.cardCvc ? 'border-red-500' : 'border-gray-300'}`}
                    required
                    maxLength="3"
                  />
                  {touched.cardCvc && errors.cardCvc && <p className="text-red-500 text-sm mt-1">{errors.cardCvc}</p>}
                </div>
              </div>
            </div>
            

            {user && (
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="saveInfo"
                    checked={formData.saveInfo}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Save shipping information to your account</span>
                </label>
              </div>
            )}


            {isFormValid() ? (
              <div className="mb-4 p-2 bg-green-50 text-green-600 rounded-md flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All fields are valid. Ready to place order.
              </div>
            ) : (
              <div className="mb-4 p-2 bg-yellow-50 text-yellow-600 rounded-md flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Please complete all required fields before submitting.
              </div>
            )}
            
            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-3 rounded-md transition ${
                isFormValid() && cart.length > 0
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
              disabled={loading || !isFormValid() || cart.length === 0}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `Complete Order - $${cartTotal.toFixed(2)}`
              )}
            </button>
          </form>
        </div>
        
        {/* Order Summary */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            {/* Cart Items */}
            <div className="space-y-2 mb-4">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.quantity}x </span>
                    <span>{item.name}</span>
                    {item.selectedSize && <span className="text-gray-500 ml-1">({item.selectedSize})</span>}
                  </div>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            {/* Subtotal */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between mb-2">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
              </div>
              
              <div className="flex justify-between mb-2">
                <span>Tax (11.5%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            </div>
            
          
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutForm;