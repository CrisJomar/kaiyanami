import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShopContext } from '../context/ShopContext';
import WishlistButton from './WishlistButton';
import axios from 'axios';
import StarRating from './StarRating';

const ProductCard = ({ product }) => {
  const { addToCart } = useShopContext();
  const [rating, setRating] = useState({ average: 0, total: 0 });

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/reviews/product/${product.id}`);
        setRating({
          average: response.data.average,
          total: response.data.total
        });
      } catch (error) {
        console.error('Error fetching product rating:', error);
      }
    };
    
    fetchRating();
  }, [product.id]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };


  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };


  const categoryName = product.category?.name || 'Uncategorized';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
      <Link to={`/product/${product.id}`} className="block flex-1">
        <div className="relative pb-[100%] overflow-hidden">
          <img 
            src={Array.isArray(product.imageUrl) ? product.imageUrl[0] : product.imageUrl} 
            alt={product.name} 
            className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              e.target.src = '/images/collection-default.jpg';
            }}
          />
          <div className="absolute top-2 right-2 z-10">
            <WishlistButton productId={product.id} size="sm" />
          </div>
          {product.isNew && (
            <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold py-1 px-2 rounded uppercase">
              New
            </span>
          )}
          {product.isFeatured && (
            <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold py-1 px-2 rounded uppercase">
              Featured
            </span>
          )}
          {product.onSale && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold py-1 px-2 rounded uppercase">
              Sale
            </span>
          )}
          {product.discountPercentage > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold py-1 px-2 rounded uppercase">
              {Math.round(product.discountPercentage)}% Off
            </span>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{product.name}</h3>
          <p className="text-sm text-gray-500 capitalize mb-3">{categoryName}</p>
          
          <div className="flex items-center gap-2">
            {product.onSale && product.originalPrice ? (
              <>
                <span className="font-bold text-red-600">{formatPrice(product.price)}</span>
                <span className="text-gray-400 text-sm line-through">{formatPrice(product.originalPrice)}</span>
              </>
            ) : (
              <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
            )}
          </div>
          <span className={`text-sm ${product.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
          {rating.total > 0 && (
            <div className="flex items-center mt-2">
              <StarRating rating={rating.average} readOnly={true} size="sm" />
              <span className="text-sm text-gray-600 ml-1">({rating.total})</span>
            </div>
          )}
        </div>
      </Link>
      
      <button 
        className="w-full bg-gray-900 text-white py-2.5 px-4 font-semibold uppercase tracking-wider hover:bg-black transition-colors duration-200"
        onClick={handleAddToCart}
        aria-label={`Add ${product.name} to cart`}
      >
        Add to Cart
      </button>
    </div>
  );
};

export default ProductCard;