import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5001/api/auth/validate', {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Auth validation response:', response.data);

      
        if (response.data && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          console.log('User authenticated:', response.data.user.email);
        } else {
          console.log('Invalid response from validation endpoint');
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('Auth validation error:', err);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      setError('');
      console.log(`Attempting login for: ${email}`);
      
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email,
        password
      });
      
      console.log('Login response data:', response.data);
      
      if (!response.data || !response.data.token || !response.data.user) {
        throw new Error('Invalid response format');
      }
      
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return userData;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Authentication failed');
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      setError('');
      const response = await axios.post('http://localhost:5001/api/auth/register', userData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  
  const getUserDisplayName = () => {
    if (!user) return 'Guest';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email.split('@')[0]; 
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      currentUser: user,  
      isAuthenticated,
      isLoading,
      error,
      login,
      register,
      logout,
      getUserDisplayName,
      setError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;