import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaHome, FaTrash, FaPencilAlt, FaPlus, FaCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';

const AddressBook = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      const response = await axios.get('http://localhost:5001/api/addresses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAddresses(response.data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEdit = (address) => {
    setFormData({
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
    setShowForm(true);
  };

  const handleDelete = async (id) => {
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

  const handleSetDefault = async (id) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      if (editingAddress) {
        // Update existing address
        await axios.put(`http://localhost:5001/api/addresses/${editingAddress}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success('Address updated successfully');
      } else {
        // Create new address
        await axios.post('http://localhost:5001/api/addresses', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success('Address added successfully');
      }
      
      // Reset form and refetch addresses
      setFormData({
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
      setEditingAddress(null);
      setShowForm(false);
      fetchAddresses();
      
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">My Addresses</h2>
        {!showForm && (
          <button
            onClick={() => {
              setEditingAddress(null);
              setFormData({
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
              setShowForm(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FaPlus className="mr-2" /> Add New Address
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {showForm ? (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="font-medium mb-4">{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address Line 1</label>
                <input
                  type="text"
                  name="address1"
                  value={formData.address1}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  name="address2"
                  value={formData.address2}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">State/Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Postal Code</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 mr-2"
                  />
                  <span className="text-sm font-medium">Set as default address</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
              >
                {editingAddress ? 'Update Address' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {addresses.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded-md">
              <FaHome className="mx-auto text-gray-400 text-4xl mb-2" />
              <p className="text-gray-500">You haven't added any addresses yet.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-500 underline"
              >
                Add your first address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`border rounded-md p-4 ${address.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
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
                    <p>
                      {address.city}, {address.state} {address.postalCode}
                    </p>
                    <p>{address.country}</p>
                    {address.phoneNumber && <p>Phone: {address.phoneNumber}</p>}
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="text-xs text-gray-600 hover:text-blue-500 px-2 py-1 border border-gray-300 rounded-md"
                      >
                        <FaCheck className="inline mr-1" /> Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(address)}
                      className="text-xs text-gray-600 hover:text-blue-500 px-2 py-1 border border-gray-300 rounded-md"
                    >
                      <FaPencilAlt className="inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1 border border-red-300 rounded-md"
                    >
                      <FaTrash className="inline mr-1" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AddressBook;