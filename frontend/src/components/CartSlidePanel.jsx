import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaTrash } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';

const CartSlidePanel = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch cart data when the panel opens
  useEffect(() => {
    if (isOpen && user) {
      fetchCartData();
    }
  }, [isOpen, user]);

  const fetchCartData = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCartItems(response.data.items || []);
      setSubtotal(response.data.subtotal || 0);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError('Failed to load your cart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/cart/items/${itemId}`, 
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setCartItems(response.data.items || []);
      setSubtotal(response.data.subtotal || 0);
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError('Failed to update item quantity.');
    }
  };

  const removeItem = async (itemId) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/cart/items/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setCartItems(response.data.items || []);
      setSubtotal(response.data.subtotal || 0);
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item from cart.');
    }
  };

  const clearCart = async () => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/cart`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setCartItems([]);
      setSubtotal(0);
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError('Failed to clear cart.');
    }
  };

  // Calculate total directly within the component
  const getTotal = () => {
    return subtotal;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-lg transform transition-all">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Cart</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                &times;
              </button>
            </div>
          </div>

          {/* Cart Content */}
          <div className="flex-grow overflow-auto p-4">
            {isLoading ? (
              <p className="text-center py-4">Loading your cart...</p>
            ) : error ? (
              <p className="text-red-500 text-center py-4">{error}</p>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Your cart is empty</p>
                <Link to="/products" onClick={onClose} className="text-blue-600 hover:underline">
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <div>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex border-b py-4">
                    <div className="w-20 h-20 flex-shrink-0">
                      <img 
                        src={item.product.imageUrl || 'https://placehold.co/100x100'} 
                        alt={item.product.name}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="ml-4 flex-grow">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-gray-500 text-sm">${item.product.price.toFixed(2)}</p>
                      <div className="flex items-center mt-2">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 bg-gray-200 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="mx-2">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 bg-gray-200 flex items-center justify-center"
                        >
                          +
                        </button>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="ml-auto text-red-500"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 text-right">
                  <button 
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer with totals and checkout button */}
          <div className="p-4 border-t mt-auto">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold mb-4">
              <span>Total:</span>
              <span>${getTotal().toFixed(2)}</span>
            </div>
            <Link
              to={cartItems.length > 0 ? "/checkout" : "#"}
              onClick={cartItems.length > 0 ? onClose : null}
              className={`block w-full py-2 px-4 bg-blue-600 text-white text-center rounded ${
                cartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartSlidePanel;