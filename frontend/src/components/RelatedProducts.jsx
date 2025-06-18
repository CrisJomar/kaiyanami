import React from 'react';
import { Link } from 'react-router-dom';
import { useShopContext } from '../context/ShopContext';
import { FaStar } from 'react-icons/fa';

const RelatedProducts = ({ currentProductId, category }) => {
  const { products } = useShopContext();
  
  
  const relatedProducts = products
    .filter(product => 
      product.category === category && 
      product.id !== currentProductId
    )
    .slice(0, 4); // Limit to 4 related products
  
  if (relatedProducts.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product) => (
          <Link 
            key={product.id} 
            to={`/product/${product.id}`}
            className="group"
          >
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
              <img
                src={product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image'}
                alt={product.name}
                className="h-full w-full object-cover object-center group-hover:opacity-75"
              />
              {product.discount > 0 && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                  {product.discount}% OFF
                </div>
              )}
            </div>
            <h3 className="mt-4 text-sm text-gray-700">{product.name}</h3>
            <div className="flex items-center mt-1">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, index) => (
                  <FaStar 
                    key={index} 
                    className={`${
                      index < product.rating ? 'text-yellow-400' : 'text-gray-300'
                    } h-3 w-3`}
                  />
                ))}
              </div>
              <p className="ml-1 text-xs text-gray-500">({product.reviewCount})</p>
            </div>
            <div className="mt-1 flex items-center">
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
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
