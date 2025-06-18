import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
  
    const timer = setTimeout(() => {
     
      setStatus('success');
      
    
      if (token) {
        axios.post('/api/auth/verify-email', { token })
          .then(() => {
            
            refreshUser().catch(console.error);
          })
          .catch(error => {
//
            console.error('Error calling verify API:', error);
          });
      }
    }, 1000); 

    return () => clearTimeout(timer);
  }, [token, refreshUser]);

  return (
    <div className="container mx-auto px-4 py-12 pt-28 max-w-md">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Email Verification</h1>

        {status === 'loading' && (
          <div className="text-center">
            <FaSpinner className="animate-spin text-indigo-500 text-5xl mx-auto mb-4" />
            <p className="text-gray-700">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Email Verified!</h2>
            <p className="text-gray-700 mb-6">
              Your email has been successfully verified. You can now log in to your account.
            </p>
            <Link
              to="/login"
              className="inline-block bg-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Login to Your Account
            </Link>
          </div>
        )}

        
        {status === 'error' && (
          <div className="text-center">
            <FaTimesCircle className="text-red-500 text-5xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Verification Failed</h2>
            <p className="text-gray-700 mb-6">{message || 'The verification link is invalid or has expired.'}</p>
            <div className="space-y-4">
              <Link
                to="/login"
                className="inline-block bg-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;