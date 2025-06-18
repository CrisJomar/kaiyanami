import React from 'react';

const AddressSelector = ({ addresses, selectedAddressId, onSelectAddress }) => {
  if (!addresses || addresses.length === 0) {
    return (
      <div className="p-4 bg-amber-50 text-amber-600 border border-amber-200 rounded">
        You don't have any saved addresses. Please add an address first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map(address => (
        <div 
          key={address.id} 
          className={`p-4 border rounded cursor-pointer ${
            selectedAddressId === address.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
          onClick={() => onSelectAddress(address.id)}
        >
          <div className="flex items-start">
            <input 
              type="radio" 
              name="addressSelection" 
              checked={selectedAddressId === address.id}
              onChange={() => onSelectAddress(address.id)}
              className="mt-1 mr-3"
            />
            <div>
              <p className="font-medium">{address.fullName || 'Your Address'}</p>
              <p>{address.address1 || address.street}</p>
              {(address.address2 || address.street2) && <p>{address.address2 || address.street2}</p>}
              <p>{address.city}, {address.state} {address.postalCode || address.zipCode}</p>
              <p>{address.country}</p>
              {address.isDefault && <span className="text-sm text-blue-600">Default Address</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AddressSelector;