import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  
  console.log("AdminRoute check:", {
    isAuthenticated,
    currentUser,
    role: currentUser?.role
  });
  
  if (isLoading) {
    return <div className="p-8 text-center">Checking admin access...</div>;
  }
  
  
  if (!isAuthenticated || !currentUser || currentUser.role !== 'admin') {
    console.log("Admin access denied - redirecting to unauthorized");
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

export default AdminRoute;