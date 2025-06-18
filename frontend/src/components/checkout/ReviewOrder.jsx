import React from 'react';
import { useShopContext } from '../../context/ShopContext';
import { Link } from 'react-router-dom';

const ReviewOrder = ({ cart = [], subtotal = 0, shipping = 0, tax = 0, customerInfo = {}, shippingInfo = {} }) => {

  const { cart: contextCart } = useShopContext();
  
  const itemsToDisplay = cart.length > 0 ? cart : (contextCart || []);
  
  if (itemsToDisplay.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-600 mb-6">Looks like you haven't added any items to your cart yet.</p>
        <Link to="/collection" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors">
          Continue Shopping
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Order Summary ({itemsToDisplay.length} items)</h3>
      
      {/* Use itemsToDisplay instead of cart */}
      <div className="divide-y divide-gray-200">
        {itemsToDisplay.length > 0 ? (
          itemsToDisplay.map((item) => (
            <div key={item.id} className="py-2 flex justify-between">
              <div className="flex items-center">
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-12 h-12 object-cover mr-4" 
                  />
                )}
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
                </div>
              </div>
              <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No items in cart</p>
        )}
      </div>
      
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <p>Subtotal</p>
          <p>${subtotal.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p>Shipping</p>
          <p>${shipping.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p>Tax</p>
          <p>${tax.toFixed(2)}</p>
        </div>
        <div className="flex justify-between font-bold">
          <p>Total</p>
          <p>${(subtotal + shipping + tax).toFixed(2)}</p>
        </div>
      </div>
      
      {/* Shipping info */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-2">Shipping Information</h3>
        <p>{customerInfo.firstName} {customerInfo.lastName}</p>
        <p>{customerInfo.email}</p>
        <p>{shippingInfo.address}</p>
        <p>{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}</p>
        <p>{shippingInfo.country}</p>
      </div>
    </div>
  );
};

export default ReviewOrder;