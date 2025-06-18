import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !location.search) {
      console.log('Already authenticated, redirecting to home');
      navigate('/', { replace: true });
      return;
    }
    
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (token) {
      // Store token
      localStorage.setItem('token', token);
      
      // Log success
      console.log('✅ Authentication successful with token');
      toast.success('Successfully logged in!');
      
      // Redirect to home page
      navigate('/', { replace: true });
    } else {
      console.error('❌ No token received in callback');
      toast.error('Authentication failed');
      navigate('/login', { replace: true });
    }
  }, [location, navigate, isAuthenticated]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
        <p className="text-gray-600">Please wait while we complete your login.</p>
      </div>
    </div>
  );
};

export default AuthCallback;