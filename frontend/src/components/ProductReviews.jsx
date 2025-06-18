import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import StarRating from './StarRating';
import { FaUser } from 'react-icons/fa';

const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    content: ''
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/reviews/product/${productId}`);
      setReviews(response.data.reviews);
      setAverageRating(response.data.average);
      setTotalReviews(response.data.total);
      
      // Check if user has already reviewed
      const token = localStorage.getItem('token');
      if (token) {
        const userFromToken = await getUserFromToken(token);
        if (userFromToken) {
          const userReviewFound = response.data.reviews.find(
            review => review.userId === userFromToken.id
          );
          setUserReview(userReviewFound || null);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const getUserFromToken = async (token) => {
    try {
      // Try to get user from /api/auth/me
      const response = await axios.get('http://localhost:5001/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user from /api/auth/me:', error);
      
      // Fallback: Try to decode the JWT token locally
      try {
        // This is a simple JWT decoder that doesn't validate the signature
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
      } catch (decodeError) {
        console.error('Error decoding token:', decodeError);
        return null;
      }
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.info('Please login to submit a review');
      return;
    }
    
    if (newReview.rating < 1) {
      toast.error('Please select a rating');
      return;
    }
    
    if (!newReview.content.trim()) {
      toast.error('Please enter a review');
      return;
    }
    
    try {
      const response = await axios.post(
        `http://localhost:5001/api/reviews/product/${productId}`,
        newReview,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add the new review to the list
      setReviews([response.data, ...reviews]);
      setUserReview(response.data);
      setShowReviewForm(false);
      setNewReview({ rating: 5, title: '', content: '' });
      
      // Update average and total
      const newTotal = totalReviews + 1;
      const newAverage = (averageRating * totalReviews + newReview.rating) / newTotal;
      setTotalReviews(newTotal);
      setAverageRating(newAverage);
      
      toast.success('Review submitted successfully');
    } catch (error) {
      console.error('Error submitting review:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to submit review');
      }
    }
  };

  const handleDeleteReview = async (reviewId) => {
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`http://localhost:5001/api/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove the review from the list
      const updatedReviews = reviews.filter(review => review.id !== reviewId);
      setReviews(updatedReviews);
      setUserReview(null);
      
      // Update average and total
      const newTotal = totalReviews - 1;
      const newAverage = newTotal > 0
        ? (averageRating * totalReviews - userReview.rating) / newTotal
        : 0;
      setTotalReviews(newTotal);
      setAverageRating(newAverage);
      
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6">Customer Reviews</h2>
      
      <div className="flex items-center mb-6">
        <div className="flex items-center">
          <StarRating rating={averageRating} readOnly={true} size="lg" />
          <span className="ml-2 text-xl font-medium">{averageRating.toFixed(1)}</span>
        </div>
        <span className="mx-4 text-gray-300">|</span>
        <span>{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</span>
      </div>
      
      {!userReview && (
        <div className="mb-8">
          {showReviewForm ? (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Write a Review</h3>
              <form onSubmit={handleSubmitReview}>
                <div className="mb-4">
                  <label className="block mb-2">Your Rating</label>
                  <StarRating 
                    rating={newReview.rating} 
                    setRating={(rating) => setNewReview({...newReview, rating})}
                    size="lg"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block mb-2">Review Title</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Summarize your experience"
                    value={newReview.title}
                    onChange={(e) => setNewReview({...newReview, title: e.target.value})}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block mb-2">Review</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    rows="4"
                    placeholder="What did you like or dislike about this product?"
                    value={newReview.content}
                    onChange={(e) => setNewReview({...newReview, content: e.target.value})}
                    required
                  ></textarea>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Submit Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowReviewForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Write a Review
            </button>
          )}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="border-b pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center mb-2">
                    <StarRating rating={review.rating} readOnly={true} />
                    {review.title && (
                      <h3 className="font-medium ml-2">{review.title}</h3>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <div className="flex items-center">
                      {review.user.avatar ? (
                        <img 
                          src={review.user.avatar} 
                          alt={`${review.user.firstName}`} 
                          className="w-6 h-6 rounded-full mr-2"
                        />
                      ) : (
                        <FaUser className="w-5 h-5 mr-2" />
                      )}
                      <span>
                        {review.user.firstName} {review.user.lastName?.charAt(0)}.
                      </span>
                    </div>
                    <span className="mx-2">•</span>
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {userReview && userReview.id === review.id && (
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
              
              <p className="text-gray-800">{review.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
        </div>
      )}
    </div>
  );
};

export default ProductReviews;