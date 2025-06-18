import React from 'react';

const AdminHome = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard Home</h1>
      <p className="mb-4">Welcome to the admin dashboard.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">Quick Stats</h2>
          <p>View your store performance at a glance.</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">Recent Orders</h2>
          <p>Manage your most recent customer orders.</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">Low Stock</h2>
          <p>Products that need your attention.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;