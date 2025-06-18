import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { FaBell, FaSignOutAlt, FaUser } from 'react-icons/fa';

const AdminHeader = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800">Admin Dashboard</h1>
        
        <div className="flex items-center">
          <div className="relative mr-4">
            <FaBell className="text-gray-500 hover:text-gray-700 cursor-pointer" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-xs flex items-center justify-center">
              0
            </span>
          </div>
          
          <div className="relative group">
            <button className="flex items-center text-gray-700 focus:outline-none">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </div>
              <span className="hidden md:block">{user?.firstName || 'Admin'}</span>
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg hidden group-hover:block z-10">
              <div className="py-1">
                <Link to="/admin/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <FaUser className="mr-2" /> Profile
                </Link>
                <button 
                  onClick={logout}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FaSignOutAlt className="mr-2" /> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;