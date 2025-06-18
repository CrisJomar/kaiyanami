import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductFilter from '../components/ProductFilter';
import LoadingSpinner from '../components/LoadingSpinner';

const Collection = () => {
  const { category } = useParams(); 
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [priceMax, setPriceMax] = useState(1000);
  

  const [filters, setFilters] = useState({
    category: category || searchParams.get('category') || '',
    priceRange: [
      parseInt(searchParams.get('minPrice') || '0', 10),
      parseInt(searchParams.get('maxPrice') || priceMax, 10)
    ],
    inStock: searchParams.get('inStock') === 'true',
    onSale: searchParams.get('onSale') === 'true'
  });
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        
        const productsResponse = await axios.get('http://localhost:5001/api/products');
        const allProducts = productsResponse.data.products || productsResponse.data;
        setProducts(allProducts);
        

        if (allProducts.length > 0) {
          const maxProductPrice = Math.max(...allProducts.map(p => p.price || 0));
          const roundedMax = Math.ceil(maxProductPrice / 100) * 100; 
          setPriceMax(roundedMax > 0 ? roundedMax : 1000);
          

          setFilters(prev => ({
            ...prev,
            priceRange: [prev.priceRange[0], Math.max(prev.priceRange[1], roundedMax)]
          }));
        }
        
        const uniqueCategories = allProducts
          .map(product => product.category)
          .filter(Boolean) 
          .reduce((unique, category) => {
        
            const categoryName = typeof category === 'object' ? category.name : category;
            
            const exists = unique.some(cat => 
              (typeof cat === 'object' && cat.name === categoryName) || 
              cat === categoryName
            );
            
            if (!exists) {
              unique.push(category);
            }
            
            return unique;
          }, []);
        
        setCategories(uniqueCategories);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  

  useEffect(() => {
    if (products.length > 0) {
      let filtered = [...products];
      
  
      if (filters.category) {
        filtered = filtered.filter(product => {
  
          const productCategory = product.category?.name || product.category;
          return productCategory === filters.category;
        });
      }
      
      filtered = filtered.filter(product => 
        product.price >= filters.priceRange[0] && 
        product.price <= filters.priceRange[1]
      );
      
      if (filters.inStock) {
        filtered = filtered.filter(product => product.stock > 0);
      }
      
      if (filters.onSale) {
        filtered = filtered.filter(product => 
          product.onSale || product.discountPercentage > 0
        );
      }
      
      setFilteredProducts(filtered);
      
      const newParams = new URLSearchParams();
      if (filters.category) newParams.set('category', filters.category);
      newParams.set('minPrice', filters.priceRange[0]);
      newParams.set('maxPrice', filters.priceRange[1]);
      if (filters.inStock) newParams.set('inStock', 'true');
      if (filters.onSale) newParams.set('onSale', 'true');
      setSearchParams(newParams, { replace: true });
    }
  }, [filters, products, setSearchParams]);
  
  const handleFilterChange = (newFilters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {filters.category || 'All Products'}
      </h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <div className="w-full lg:w-1/4">
          <ProductFilter 
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categories}
            priceMax={priceMax}
          />
        </div>
        
        {/* Product grid */}
        <div className="w-full lg:w-3/4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-8">
              {error}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-lg text-gray-600">No products found matching your criteria.</p>
              <button 
                onClick={() => setFilters({
                  category: '',
                  priceRange: [0, priceMax],
                  inStock: false,
                  onSale: false
                })}
                className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-500">
                Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Collection;