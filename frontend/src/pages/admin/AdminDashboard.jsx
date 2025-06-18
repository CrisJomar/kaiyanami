import React from 'react';
import { Outlet } from 'react-router-dom'; 
import AdminSidebar from '../../components/admin/AdminSidebar';
// other imports...

const AdminDashboard = () => {
  console.log("AdminDashboard rendering"); // Add this debug log

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />
      
  
      <div className="flex-1 overflow-auto">
        <div className="p-6">
       
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;