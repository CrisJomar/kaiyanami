import React from 'react';
import { Link } from 'react-router-dom';
import { useShopContext } from '../context/ShopContext';
import Item from './Item';

const BestSeller = () => {
  // Use the hook to access context
  const { products, addToCart } = useShopContext();

 
  if (!products || !Array.isArray(products)) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 rounded-lg animate-pulse h-64"></div>
        ))}
      </div>
    );
  }

  const bestSellerProducts = products
    .filter((_, index) => index % 2 === 0)  
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {bestSellerProducts.map((item) => (
        <Item
          key={item.id}
          id={item.id}
          name={item?.name || 'Product Name'}
          image={item.image}
          price={item.price}
          category={item.category}
        />
      ))}
    </div>
  );
};

export default BestSeller;