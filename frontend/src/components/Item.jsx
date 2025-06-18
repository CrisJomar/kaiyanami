import React from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';
import { useShopContext } from '../context/ShopContext';


const safeRenderValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return String(value.name || 'Item');
  return String(value);
};

const Item = ({ id, name, price, image, category, product }) => {
  const { addToCart, getProductById } = useShopContext();
  

  const productData = product || (id ? getProductById(id) : null);
  
 
  if (!productData && !name) {
    return (
      <div className="bg-white p-4 rounded shadow-md opacity-50">
        <p className="text-center text-gray-500">Product data unavailable</p>
      </div>
    );
  }
  
  
  const productId = id || productData?.id;
  const productName = name || productData?.name || 'Unknown Product';
  const productPrice = price || productData?.price || 0;
  const productImage = image || productData?.imageUrl || 'https://via.placeholder.com/300x400?text=No+Image';
  const productCategory = category || productData?.category || '';
  
  // Format price with currency symbol
  const formattedPrice = `$${parseFloat(productPrice).toFixed(2)}`;

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (productData) {
      addToCart(productData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:-translate-y-1">
      <Link to={`/product/${productId}`} className="block">
        <div className="relative pb-[125%] overflow-hidden">
          <img
            src={Array.isArray(productImage) ? productImage[0] : productImage}
            alt={safeRenderValue(productName)}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/300x400?text=No+Image';
            }}
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {safeRenderValue(productName)}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-gray-900">{formattedPrice}</p>
            <button
              onClick={handleAddToCart}
              className="bg-black text-white p-2 rounded-full hover:bg-gray-800 transition"
              aria-label="Add to cart"
            >
              <FaShoppingCart size={16} />
            </button>
          </div>
          {productCategory && (
            <p className="mt-2 text-sm text-gray-500 capitalize">
              {safeRenderValue(productCategory)}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
};

export default Item;