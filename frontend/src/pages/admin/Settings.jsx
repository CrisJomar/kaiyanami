import React from 'react';

const Settings = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Store Settings</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="storeName">
            Store Name
          </label>
          <input 
            type="text" 
            id="storeName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
            placeholder="Kaiyanami Store"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="storeEmail">
            Contact Email
          </label>
          <input 
            type="email" 
            id="storeEmail"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
            placeholder="contact@example.com"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currency">
            Currency
          </label>
          <select 
            id="currency"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="USD">USD ($)</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
        
        <div className="mb-4">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="orderNotifications" 
              className="mr-2"
            />
            <label className="text-gray-700" htmlFor="orderNotifications">
              Order notifications
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Receive email notifications for new orders
          </p>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="lowStockNotifications" 
              className="mr-2"
            />
            <label className="text-gray-700" htmlFor="lowStockNotifications">
              Low stock notifications
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Receive alerts when product inventory is running low
          </p>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="supportTicketNotifications" 
              className="mr-2"
            />
            <label className="text-gray-700" htmlFor="supportTicketNotifications">
              Support ticket notifications
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Receive notifications for new support tickets
          </p>
        </div>
      </div>
      
      <div className="mt-6">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;