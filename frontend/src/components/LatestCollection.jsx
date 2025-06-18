import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const LatestCollection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchLatestProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching latest products from:', '/api/products?limit=3&sort=newest');
        
        const response = await axios.get('/api/products?limit=3&sort=newest');
        console.log('Products API response:', response.data);
        
        if (Array.isArray(response.data)) {
          setProducts(response.data);
        } else if (response.data.products && Array.isArray(response.data.products)) {
          setProducts(response.data.products);
        } else {
          console.error('Unexpected API response format:', response.data);
          setError('Unexpected data format received from the server');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching latest products:', error);
        setError(error.message || 'Error loading products');
        setLoading(false);
      }
    };
    
    fetchLatestProducts();
  }, []);
  
  // Display loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 rounded-lg animate-pulse h-64"></div>
        ))}
      </div>
    );
  }
  
 
  if (error) {
    return (
      <div className="text-center text-red-500 p-4 border border-red-300 rounded-lg">
        <p>Unable to load products: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }
  
  console.log('Products ready to render:', products);
  
  return (
    <>
      {!products || products.length === 0 ? (
        <p className="text-center text-gray-500">No products available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map(product => (
            <Link 
              key={product.id} 
              to={`/product/${product.id}`} 
              className="group block overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-xl"
            >
              <div className="relative overflow-hidden">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.target.src = '/images/product-default.jpg';
                  }}
                />
                {product.isNew && (
                  <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold py-1 px-2 rounded uppercase">
                    New
                  </span>
                )}
                {product.onSale && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold py-1 px-2 rounded uppercase">
                    Sale
                  </span>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="px-5 py-2.5 bg-white text-black font-medium rounded-md">
                    View Product
                  </span>
                </div>
              </div>
              <div className="p-5 bg-white">
                <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
                <p className="text-gray-500 text-sm mb-2">{product.category?.name || 'Uncategorized'}</p>
                <div className="flex items-center gap-2">
                  {product.onSale && product.originalPrice ? (
                    <>
                      <span className="font-bold text-red-600">${product.price.toFixed(2)}</span>
                      <span className="text-gray-400 text-sm line-through">${product.originalPrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="font-bold text-gray-900">${product.price.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center mt-12">
        <Link 
          to="/collection" 
          className="inline-block px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          View Full Collection
        </Link>
      </div>
    </>
  );
};

export default LatestCollection;