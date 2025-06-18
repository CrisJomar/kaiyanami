import React, { useState, useEffect } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const WishlistButton = ({ productId, size = 'md' }) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if product is in wishlist
    const checkWishlist = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await axios.get('http://localhost:5001/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const inWishlist = response.data.some(item => item.productId === productId);
        setIsInWishlist(inWishlist);
      } catch (error) {
        console.error('Error checking wishlist:', error);
      }
    };

    checkWishlist();
  }, [productId]);

  const toggleWishlist = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      toast.info('Please login to add items to your wishlist');
      navigate('/login');
      return;
    }
    
    setLoading(true);
    
    try {
      if (isInWishlist) {
        // Remove from wishlist
        await axios.delete(`http://localhost:5001/api/wishlist/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Removed from wishlist');
        setIsInWishlist(false);
      } else {
        // Add to wishlist
        await axios.post(`http://localhost:5001/api/wishlist/${productId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Added to wishlist');
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-lg p-1',
    md: 'text-xl p-2',
    lg: 'text-2xl p-2',
  }[size] || 'text-xl p-2';

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={`transition-all ${sizeClasses} ${
        isInWishlist 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-gray-400 hover:text-red-500'
      } ${loading ? 'opacity-50' : ''}`}
      aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      {isInWishlist ? <FaHeart /> : <FaRegHeart />}
    </button>
  );
};

export default WishlistButton;