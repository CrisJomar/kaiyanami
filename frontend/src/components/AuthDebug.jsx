import React from 'react';
import { useAuth } from '../context/AuthContext';

const AuthDebug = () => {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-0 right-0 p-4 bg-gray-800 text-white text-xs opacity-75 w-80 z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <p>Status: {isLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</p>
      <p>Error: {error || 'None'}</p>
      <p>User: {user ? JSON.stringify(user, null, 2) : 'No user'}</p>
      <p>Token: {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</p>
    </div>
  );
};

export default AuthDebug;