import React from 'react';

const ProductSorter = ({ value, onChange }) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };
  
  return (
    <div className="flex items-center">
      <label htmlFor="sort-by" className="text-sm text-gray-600 mr-2">
        Sort by:
      </label>
      <select
        id="sort-by"
        value={value}
        onChange={handleChange}
        className="border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
      >
        <option value="newest">Newest</option>
        <option value="priceAsc">Price: Low to High</option>
        <option value="priceDesc">Price: High to Low</option>
        <option value="rating">Top Rated</option>
        <option value="popular">Popular</option>
      </select>
    </div>
  );
};

export default ProductSorter;