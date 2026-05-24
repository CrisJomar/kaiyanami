import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Validate token on mount and restore session
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/api/auth/validate');
        if (data?.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
        }
      } catch {
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    setError('');
    const { data } = await api.post('/api/auth/login', { email, password });

    if (!data?.token || !data?.user) throw new Error('Invalid response from server');

    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  };

  const register = async (userData) => {
    setError('');
    const { data } = await api.post('/api/auth/register', userData);

    if (data?.token) {
      localStorage.setItem('token', data.token);
    }
    if (data?.user) {
      setUser(data.user);
      setIsAuthenticated(true);
    }
    return data?.user;
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
    return user.email?.split('@')[0] ?? 'User';
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
      setError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
