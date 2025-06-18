import React from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const StarRating = ({ rating, setRating, size = 'md', readOnly = false }) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Size classes
    const sizeClasses = {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
    }[size] || 'text-xl';
    
    // Create 5 stars
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        // Full star
        stars.push(
          <FaStar 
            key={i} 
            className={`text-yellow-400 ${sizeClasses}`} 
            onClick={() => !readOnly && setRating && setRating(i)}
            onMouseEnter={() => !readOnly && setRating && setRating(i)}
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        // Half star
        stars.push(
          <FaStarHalfAlt 
            key={i} 
            className={`text-yellow-400 ${sizeClasses}`} 
            onClick={() => !readOnly && setRating && setRating(i)}
            onMouseEnter={() => !readOnly && setRating && setRating(i - 0.5)}
          />
        );
      } else {
        // Empty star
        stars.push(
          <FaRegStar 
            key={i} 
            className={`text-yellow-400 ${sizeClasses}`} 
            onClick={() => !readOnly && setRating && setRating(i)}
            onMouseEnter={() => !readOnly && setRating && setRating(i)}
          />
        );
      }
    }
    
    return stars;
  };

  return (
    <div 
      className={`flex ${!readOnly && setRating ? 'cursor-pointer' : ''}`}
      onMouseLeave={() => !readOnly && setRating && rating % 1 !== 0 && setRating(Math.floor(rating))}
    >
      {renderStars()}
    </div>
  );
};

export default StarRating;