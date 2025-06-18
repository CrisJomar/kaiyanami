import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';

const ProductGrid = ({ products = [] }) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No products found matching your criteria.</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map(product => (
        <Link 
          key={product.id} 
          to={`/product/${product.id}`}
          className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="relative aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity"
              loading="lazy" 
              
            />
            {product.discount > 0 && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                {product.discount}% OFF
              </div>
            )}
            {!product.inStock && (
              <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white text-xs font-bold px-2 py-1 rounded">
                Out of Stock
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
            
            <div className="mt-1 flex items-center">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, index) => (
                  <FaStar 
                    key={index} 
                    className={`h-3 w-3 ${
                      index < product.rating ? 'text-yellow-400' : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
              <p className="ml-1 text-xs text-gray-500">({product.reviewCount})</p>
            </div>
            
            <div className="mt-2 flex items-center">
              {product.discount > 0 ? (
                <>
                  <p className="text-sm font-medium text-gray-900">
                    ${(product.price * (1 - product.discount / 100)).toFixed(2)}
                  </p>
                  <p className="ml-2 text-xs text-gray-500 line-through">
                    ${product.price.toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  ${product.price.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ProductGrid;