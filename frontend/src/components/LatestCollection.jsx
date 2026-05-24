import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

const LatestCollection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false); // prevent double-fetch in React StrictMode

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchLatestProducts = async () => {
      try {
        const { data } = await api.get('/api/products?limit=3&sort=newest');
        const list = Array.isArray(data) ? data : (data.products ?? []);
        setProducts(list);
      } catch (err) {
        setError(err.message || 'Error loading products');
      } finally {
        setLoading(false);
      }
    };

    fetchLatestProducts();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg animate-pulse h-64" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4 border border-red-300 rounded-lg">
        <p>Unable to load products: {error}</p>
        <button
          onClick={() => { hasFetched.current = false; setError(null); setLoading(true); }}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {products.length === 0 ? (
        <p className="text-center text-gray-500">No products available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => {
            const imageUrl = Array.isArray(product.imageUrl)
              ? product.imageUrl[0]
              : product.imageUrl;

            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group block overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-xl"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.target.src = '/images/product-default.jpg'; }}
                  />
                  {product.discountPercentage > 0 && (
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
                    {product.discountPercentage > 0 ? (
                      <>
                        <span className="font-bold text-red-600">
                          ${(product.price * (1 - product.discountPercentage / 100)).toFixed(2)}
                        </span>
                        <span className="text-gray-400 text-sm line-through">
                          ${product.price.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-gray-900">${product.price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
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
