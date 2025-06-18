import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaAngleDown, FaAngleUp, FaPlusCircle } from 'react-icons/fa';

const ShippingForm = ({ shippingInfo, onSubmit }) => {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [loading, setLoading] = useState(true);

  const formik = useFormik({
    initialValues: {
      firstName: shippingInfo?.firstName || '',
      lastName: shippingInfo?.lastName || '',
      address: shippingInfo?.address || '',
      apartment: shippingInfo?.apartment || '',
      city: shippingInfo?.city || '',
      state: shippingInfo?.state || '',
      zipCode: shippingInfo?.zipCode || '',
      country: shippingInfo?.country || 'US',
      phone: shippingInfo?.phone || '',
      email: shippingInfo?.email || '',
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required('First name is required'),
      lastName: Yup.string().required('Last name is required'),
      address: Yup.string().required('Address is required'),
      city: Yup.string().required('City is required'),
      state: Yup.string().required('State is required'),
      zipCode: Yup.string().required('ZIP code is required')
        .matches(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
      phone: Yup.string().required('Phone number is required')
        .matches(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, 'Invalid phone number format'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
    }),
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      fetchAddresses(token);
    } else {
      setLoading(false);
    }
  }, []);
  
  const fetchAddresses = async (token) => {
    try {
      const response = await axios.get('http://localhost:5001/api/addresses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSavedAddresses(response.data);
      
      // If we have a default address and no initial data was provided, select it
      const defaultAddress = response.data.find(address => address.isDefault);
      if (defaultAddress && !shippingInfo?.firstName) {
        setSelectedAddressId(defaultAddress.id);
        formik.setValues({
          firstName: defaultAddress.firstName,
          lastName: defaultAddress.lastName,
          address: defaultAddress.address,
          apartment: defaultAddress.apartment || '',
          city: defaultAddress.city,
          state: defaultAddress.state,
          zipCode: defaultAddress.zipCode,
          country: defaultAddress.country,
          phone: defaultAddress.phone || '',
          email: defaultAddress.email || '',
        });
      }
    } catch (error) {
      console.error('Error fetching saved addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = (address) => {
    setSelectedAddressId(address.id);
    setUseNewAddress(false);
    formik.setValues({
      firstName: address.firstName,
      lastName: address.lastName,
      address: address.address,
      apartment: address.apartment || '',
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      phone: address.phone || '',
      email: address.email || '',
    });
    setShowAddresses(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = {
      firstName: formik.values.firstName,
      lastName: formik.values.lastName,
      email: formik.values.email,
      address: formik.values.address,
      city: formik.values.city,
      state: formik.values.state,
      zipCode: formik.values.zipCode,
    };

    // Check for empty required fields
    const emptyFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (emptyFields.length > 0) {
      // Show error for each empty field
      emptyFields.forEach(field => {
        toast.error(`Please enter your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      });
      return;
    }

    // Proceed to next step if all required fields are filled
    formik.handleSubmit();
  };

  const toggleAddresses = () => {
    setShowAddresses(!showAddresses);
  };

  // Decide whether to show the saved addresses section
  const hasSavedAddresses = savedAddresses.length > 0;
  const isLoggedIn = localStorage.getItem('token') !== null;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Shipping Information</h2>
      
      {isLoggedIn && hasSavedAddresses && !useNewAddress ? (
        <div className="mb-6">
          <div 
            className="flex justify-between items-center p-4 border rounded-md cursor-pointer bg-gray-50"
            onClick={toggleAddresses}
          >
            <div>
              <div className="font-medium">Saved Addresses</div>
              <div className="text-sm text-gray-600">
                {selectedAddressId ? 
                  `${savedAddresses.find(a => a.id === selectedAddressId)?.firstName} (${savedAddresses.find(a => a.id === selectedAddressId)?.city})` : 
                  'Select a saved address'
                }
              </div>
            </div>
            {showAddresses ? <FaAngleUp /> : <FaAngleDown />}
          </div>
          
          {showAddresses && (
            <div className="mt-2 border rounded-md max-h-64 overflow-y-auto">
              {savedAddresses.map(address => (
                <div 
                  key={address.id} 
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${selectedAddressId === address.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectAddress(address)}
                >
                  <div className="font-medium">{address.firstName}</div>
                  <div className="text-sm text-gray-600">
                    {address.address}, {address.city}, {address.state} {address.zipCode}
                  </div>
                  {address.isDefault && (
                    <div className="text-xs text-blue-600 font-medium mt-1">Default</div>
                  )}
                </div>
              ))}
              
              <div 
                className="p-3 text-blue-600 cursor-pointer hover:bg-gray-50 flex items-center"
                onClick={() => {
                  setUseNewAddress(true);
                  setSelectedAddressId(null);
                  setShowAddresses(false);
                }}
              >
                <FaPlusCircle className="mr-2" /> Use a new address
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {isLoggedIn && hasSavedAddresses && (
            <div className="mb-4">
              <button
                type="button"
                className="text-blue-600 underline flex items-center"
                onClick={() => {
                  setUseNewAddress(false);
                  setShowAddresses(true);
                }}
              >
                <span>Use a saved address</span>
              </button>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border ${
                    formik.touched.firstName && formik.errors.firstName 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border ${
                    formik.touched.lastName && formik.errors.lastName 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.lastName}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border ${
                    formik.touched.email && formik.errors.email 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {formik.touched.email && formik.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.email}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border ${
                    formik.touched.address && formik.errors.address 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {formik.touched.address && formik.errors.address && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.address}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="apartment" className="block text-sm font-medium text-gray-700">
                  Apartment, suite, etc. (optional)
                </label>
                <input
                  type="text"
                  id="apartment"
                  name="apartment"
                  value={formik.values.apartment}
                  onChange={formik.handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border ${
                    formik.touched.city && formik.errors.city 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {formik.touched.city && formik.errors.city && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State / Province
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formik.values.state}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border ${
                    formik.touched.state && formik.errors.state 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {formik.touched.state && formik.errors.state && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.state}</p>
                )}
              </div>

              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                  ZIP / Postal code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formik.values.zipCode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border ${
                    formik.touched.zipCode && formik.errors.zipCode 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {formik.touched.zipCode && formik.errors.zipCode && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.zipCode}</p>
                )}
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  value={formik.values.country}
                  onChange={formik.handleChange}
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="MX">Mexico</option>
                  {/* Add more countries as needed */}
                </select>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border ${
                    formik.touched.phone && formik.errors.phone 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {formik.touched.phone && formik.errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.phone}</p>
                )}
              </div>
            </div>

            {isLoggedIn && (
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600"
                    onChange={(e) => {
                      // Handle saving this address for future use
                      if (e.target.checked) {
                        // You can implement logic to save the address when the form is submitted
                      }
                    }}
                  />
                  <span className="ml-2 text-sm">Save this address for future use</span>
                </label>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Continue to Payment
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ShippingForm;