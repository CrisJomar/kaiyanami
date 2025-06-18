import React from 'react';
import { useAuth } from '../../context/AuthContext';

import UserCheckout from './UserCheckout';
import GuestCheckout from './GuestCheckout';

const CheckoutRouter = () => {
  const { isAuthenticated } = useAuth();
  
  return isAuthenticated ? <UserCheckout /> : <GuestCheckout />;
};

export default CheckoutRouter;