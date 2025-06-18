import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";

const ProductItem = ({ product }) => {
  const { currency } = useContext(ShopContext);
  
  
  // Check if product has sizes properly
  const hasSizes = product.hasSizes && product.sizes && product.sizes.length > 0;
  
  return (
    <div className="group relative">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={Array.isArray(product.imageUrl) ? product.imageUrl[0] : product.imageUrl}
            alt={product.name}
            className="w-full h-64 object-cover transform transition-transform group-hover:scale-110"
            onError={(e) => {
              e.target.src = null; 
            }}
          />
        </div>
        
        <div className="mt-4">
          <h3 className="text-sm text-gray-700 group-hover:text-black">{product.name}</h3>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {currency}{parseFloat(product.price).toFixed(2)}
          </p>
          
          {/* Display sizes if product has them */}
          {product.hasSizes && product.sizes && product.sizes.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Available Sizes:</p>
              <div className="flex flex-wrap gap-1">
                {product.sizes.map((sizeItem, idx) => (
                  <span 
                    key={idx} 
                    className={`
                      px-2 py-1 text-xs font-medium rounded-md
                      ${parseInt(sizeItem.stock) > 0 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-400 line-through'}
                    `}
                  >
                    {sizeItem.size}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Link>
      
      {/* View Product button */}
      <div className="mt-3">
        <Link
          to={`/product/${product.id}`}
          className="block w-full py-2 rounded text-center transition bg-black text-white hover:bg-gray-800"
        >
          View Product
        </Link>
      </div>
    </div>
  );
};

export default ProductItem;