import React from 'react';
import { Link } from 'react-router-dom';

const OrderSummary = ({ cart, subtotal, shipping, tax, shippingAddress }) => {
  const total = subtotal + shipping + tax;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };


  const formatAddress = (address) => {
    if (!address) return null;
    
    
    const isSavedAddress = 'address1' in address;
    const isAddress = 'street' in address;
    const isGuestAddress = address.fullName && 'street' in address;
    
    let formattedAddress = {
      name: '',
      line1: '',
      line2: '',
      cityStateZip: '',
      country: ''
    };
    
    // Parse address based on its type
    if (isSavedAddress) {
      formattedAddress = {
        name: address.fullName || '',
        line1: address.address1 || '',
        line2: address.address2 || '',
        cityStateZip: `${address.city || ''}, ${address.state || ''} ${address.postalCode || ''}`,
        country: address.country || 'US'
      };
    } else if (isAddress || isGuestAddress) {
      formattedAddress = {
        name: address.fullName || '',
        line1: address.street || '',
        line2: '', // Address model doesn't have street2
        cityStateZip: `${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}`,
        country: address.country || 'US'
      };
    }
    
    console.log('Address format debug:', { 
      type: isSavedAddress ? 'SavedAddress' : isGuestAddress ? 'GuestAddress' : 'Address',
      original: address,
      formatted: formattedAddress 
    });
    
    return (
      <div className="text-sm text-gray-600">
        <p className="font-medium">{formattedAddress.name}</p>
        <p>{formattedAddress.line1}</p>
        {formattedAddress.line2 && <p>{formattedAddress.line2}</p>}
        <p>{formattedAddress.cityStateZip}</p>
        <p>{formattedAddress.country}</p>
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
      <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
      
      {/* Display shipping address if available */}
      {shippingAddress && (
        <div className="mb-4 pb-4 border-b">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Shipping To</h3>
          {formatAddress(shippingAddress)}
        </div>
      )}
      
      <div className="max-h-96 overflow-y-auto mb-4">
        {cart.map((item) => (
          <div key={`${item.id}-${item.size || 'default'}`} className="flex items-center py-3 border-b">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
              <img
                src={item.imageUrl || "https://via.placeholder.com/150"}
                alt={item.name}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="ml-4 flex flex-1 flex-col">
              <div className="flex justify-between text-base font-medium text-gray-900">
                <h3 className="text-sm">{item.name}</h3>
                <p className="ml-4">{formatCurrency(item.price * item.quantity)}</p>
              </div>
              <div className="flex text-sm text-gray-500">
                <p>Qty: {item.quantity}</p>
                {item.size && <p className="ml-2">Size: {item.size}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-gray-200 py-4 space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <p>Subtotal</p>
          <p>{formatCurrency(subtotal)}</p>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <p>Shipping</p>
          <p>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</p>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <p>Tax</p>
          <p>{formatCurrency(tax)}</p>
        </div>
        
        <div className="flex justify-between text-lg font-semibold pt-2 border-t">
          <p>Total</p>
          <p>{formatCurrency(total)}</p>
        </div>
      </div>
      
      {shipping === 0 && (
        <div className="mt-4 p-2 bg-green-50 text-green-700 text-xs text-center rounded">
          You qualify for free shipping!
        </div>
      )}
      
      <div className="mt-6">
        <Link
          to="/cart"
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Return to cart
        </Link>
      </div>
    </div>
  );
};

export default OrderSummary;