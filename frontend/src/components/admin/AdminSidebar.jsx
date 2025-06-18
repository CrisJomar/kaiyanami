import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  FaHome, FaUsers, FaBoxOpen, FaShoppingCart, 
  FaChartLine, FaCog, FaHeadset, FaFileAlt
} from 'react-icons/fa';

const AdminSidebar = () => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <Link to="/" className="text-xl font-bold text-blue-600">
          Kaiyanami Store
        </Link>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        <NavLink 
          to="/admin" 
          end
          className={({isActive}) => 
            `flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <FaHome className="mr-3" /> Dashboard
        </NavLink>
        
        <NavLink 
          to="/admin/users" 
          className={({isActive}) => 
            `flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <FaUsers className="mr-3" /> Users
        </NavLink>
        
        <NavLink 
          to="/admin/products" 
          className={({isActive}) => 
            `flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <FaBoxOpen className="mr-3" /> Products
        </NavLink>
        
        <NavLink 
          to="/admin/orders" 
          className={({isActive}) => 
            `flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <FaShoppingCart className="mr-3" /> Orders
        </NavLink>
        
        <NavLink 
          to="/admin/analytics" 
          className={({isActive}) => 
            `flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <FaChartLine className="mr-3" /> Analytics
        </NavLink>
        
        {/* Add Reports Navigation Item */}
        <NavLink 
          to="/admin/reports" 
          className={({isActive}) => 
            `flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <FaFileAlt className="mr-3" /> Reports
        </NavLink>
        
        <NavLink 
          to="/admin/settings" 
          className={({isActive}) => 
            `flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <FaCog className="mr-3" /> Settings
        </NavLink>

        <NavLink 
          to="/admin/support" 
          className={({isActive}) => 
            `flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <FaHeadset className="mr-3" /> Support
        </NavLink>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <Link to="/" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
          View Storefront
        </Link>
      </div>
    </div>
  );
};

export default AdminSidebar;