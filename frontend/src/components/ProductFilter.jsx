import React, { useState } from 'react';
import { FaFilter } from 'react-icons/fa';

const ProductFilter = ({ filters, onFilterChange, categories, priceMax }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleCategoryChange = (e) => {
    const categoryName = e.target.value;
    console.log('Category selected:', categoryName);
    onFilterChange({ category: categoryName });
  };
  
  const handleMaxPriceChange = (e) => {
    const value = parseInt(e.target.value, 10);
    onFilterChange({ 
      priceRange: [filters.priceRange[0], value] 
    });
  };
  
  const handleMinPriceChange = (e) => {
    const value = parseInt(e.target.value, 10);
    onFilterChange({ 
      priceRange: [value, filters.priceRange[1]] 
    });
  };
  
  const handleInStockChange = (e) => {
    onFilterChange({ inStock: e.target.checked });
  };
  
  const handleOnSaleChange = (e) => {
    onFilterChange({ onSale: e.target.checked });
  };

  const toggleFilters = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4 lg:hidden">
        <h2 className="text-lg font-medium">Filters</h2>
        <button onClick={toggleFilters} className="text-gray-500">
          <FaFilter />
        </button>
      </div>
      
      <div className={`${isOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Category</h3>
          <select 
            id="category" 
            name="category"
            value={filters.category || ""}
            onChange={handleCategoryChange}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((category, index) => {
              // Handle potential null/undefined values
              if (!category) return null;
              
              const categoryId = typeof category === 'object' 
                ? `${category.id}-${index}` // Add index to make key unique
                : `category-${index}`;
              const categoryName = typeof category === 'object' ? category.name : category;
              
              return (
                <option key={categoryId} value={categoryName}>
                  {categoryName}
                </option>
              );
            })}
          </select>
        </div>
        
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Price Range</h3>
          <div className="flex justify-between mb-2 text-xs text-gray-500">
            <span>${filters.priceRange[0]}</span>
            <span>${filters.priceRange[1]}</span>
          </div>
          <input
            type="range"
            min="0"
            max={priceMax}
            value={filters.priceRange[1]}
            onChange={handleMaxPriceChange}
            className="w-full"
          />
        </div>
        
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Availability</h3>
          <div className="flex items-center mb-2">
            <input
              id="inStock"
              type="checkbox"
              checked={filters.inStock}
              onChange={handleInStockChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="inStock" className="ml-2 text-sm text-gray-700">
              In Stock Only
            </label>
          </div>
        </div>
        
        
        <button
          onClick={() => onFilterChange({
            category: '',
            priceRange: [0, priceMax],
            inStock: false,
            onSale: false
          })}
          className="w-full py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded hover:bg-gray-300 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
};

export default ProductFilter;