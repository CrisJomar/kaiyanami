import React from "react";
import { Link } from "react-router-dom";
import { useShopContext } from "../context/ShopContext";

const ShoppingCart = () => {
  const { 
    cart, 
    updateCartItemQuantity, 
    removeFromCart, 
    clearCart, 
    calculateSubtotal,
    calculateTax,
    calculateTotal,
    currency
  } = useShopContext();

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">Your cart is empty.</p>
          <Link 
            to="/shop" 
            className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }


  const getCartItemId = (item) => {
    return item.selectedSize ? `${item.id}-${item.selectedSize}` : item.id;
  };

  const handleQuantityChange = (itemId, selectedSize, newQuantity) => {
    if (updateCartItemQuantity) {
      updateCartItemQuantity(itemId, selectedSize, newQuantity);
    } else {
      console.error("updateCartItemQuantity function is not available!");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cart.map((item) => {
                  const itemPrice = parseFloat(item.price);
                  const finalPrice = item.discountPercentage > 0 
                    ? itemPrice * (1 - item.discountPercentage / 100) 
                    : itemPrice;
                  
                  return (
                    <tr key={getCartItemId(item)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-16 w-16 flex-shrink-0">
                            <img 
                              className="h-16 w-16 rounded object-cover" 
                              src={Array.isArray(item.imageUrl) ? item.imageUrl[0] : item.imageUrl} 
                              alt={item.name} 
                              onError={(e) => {
                                e.target.src = "/placeholder-image.jpg";
                              }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              <Link to={`/product/${item.id}`} className="hover:text-blue-600">
                                {item.name}
                              </Link>
                            </div>
                            {item.selectedSize && (
                              <div className="text-sm text-gray-500">
                                Size: {item.selectedSize}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {currency}{finalPrice.toFixed(2)}
                        </div>
                        {item.discountPercentage > 0 && (
                          <div className="text-xs text-red-500 line-through">
                            {currency}{itemPrice.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex border border-gray-300 rounded-md w-24">
                          <button
                            onClick={() => {
                              // Don't allow quantity to go below 1
                              if (item.quantity > 1) {
                                handleQuantityChange(item.id, item.selectedSize, item.quantity - 1);
                              }
                            }}
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                handleQuantityChange(item.id, item.selectedSize, val);
                              }
                            }}
                            className="w-10 text-center border-x border-gray-300 py-1 focus:outline-none"
                          />
                          <button
                            onClick={() => handleQuantityChange(item.id, item.selectedSize, item.quantity + 1)}
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currency}{(finalPrice * item.quantity).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => removeFromCart(item.id, item.selectedSize)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex justify-between">
            <Link
              to="/shop"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Continue Shopping
            </Link>
            <button
              onClick={clearCart}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Clear Cart
            </button>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:w-1/3">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
            
            <div className="border-t border-gray-200 py-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-medium">{currency}{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Tax (11.5%)</span>
                <span className="text-gray-900">{currency}{calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{currency}{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-6">
              <Link
                to="/checkout"
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;