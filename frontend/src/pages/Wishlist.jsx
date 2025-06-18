import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTrash, FaShoppingCart } from 'react-icons/fa';
import { useShopContext } from '../context/ShopContext'; // Add this import

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useShopContext(); // Get addToCart from context

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      try {
        const response = await axios.get('http://localhost:5001/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setWishlistItems(response.data);
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        toast.error('Failed to load wishlist items');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWishlist();
  }, [navigate]);

  const removeFromWishlist = async (productId) => {
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`http://localhost:5001/api/wishlist/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setWishlistItems(wishlistItems.filter(item => item.productId !== productId));
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove item');
    }
  };

  // Replace your direct API call with the context function
  const handleAddToCart = (item) => {
    if (!item || !item.product) return;
    
    // Create a cart item that matches the expected format
    const cartItem = {
      ...item.product,
      quantity: 1,
      selectedSize: null // Optionally handle sizes if needed
    };
    
    // Use the context function that works in Product.jsx
    addToCart(cartItem);
    toast.success(`${item.product.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-6">My Wishlist</h1>
      
      {wishlistItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl mb-4">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">Add items to your wishlist while you shop!</p>
          <Link 
            to="/collection/all" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
              <Link to={`/product/${item.product.id}`}>
                <div className="h-56 bg-gray-200 relative overflow-hidden">
                  {item.product.images && item.product.images[0] && (
                    <img 
                      src={`http://localhost:5001${item.product.images[0].url}`}
                      alt={item.product.name}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  )}
                </div>
              </Link>
              
              <div className="p-4">
                <Link to={`/product/${item.product.id}`}>
                  <h2 className="text-lg font-semibold mb-2 hover:text-blue-600">
                    {item.product.name}
                  </h2>
                </Link>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-900 font-medium">
                    ${Number(item.product.price).toFixed(2)}
                  </span>
                  {item.product.compareAtPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      ${Number(item.product.compareAtPrice).toFixed(2)}
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <FaShoppingCart className="mr-2" /> Add to Cart
                  </button>
                  <button
                    onClick={() => removeFromWishlist(item.productId)}
                    className="p-2 text-gray-600 hover:text-red-600 bg-gray-100 rounded"
                    aria-label="Remove from wishlist"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;