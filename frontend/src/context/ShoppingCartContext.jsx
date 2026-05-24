import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Load the appropriate cart based on authentication status
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        if (isAuthenticated) {
          const { data } = await api.get('/api/cart');
          setCart(data);
        } else {
          const localCart = localStorage.getItem('anonymousCart');
          if (localCart) setCart(JSON.parse(localCart));
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [isAuthenticated, user?.id]);

  // Persist guest cart to localStorage
  useEffect(() => {
    if (!isAuthenticated && cart.length > 0) {
      localStorage.setItem('anonymousCart', JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  const addToCart = async (product, quantity = 1, size = null) => {
    try {
      if (isAuthenticated) {
        const { data } = await api.post('/api/cart/add', { productId: product.id, quantity, size });
        setCart(data);
      } else {
        const existingIndex = cart.findIndex(
          (item) => item.productId === product.id && item.size === size
        );
        if (existingIndex >= 0) {
          const updated = [...cart];
          updated[existingIndex].quantity += quantity;
          setCart(updated);
        } else {
          setCart([...cart, {
            id: `temp-${Date.now()}`,
            productId: product.id,
            product,
            quantity,
            size,
            price: product.price,
          }]);
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      if (isAuthenticated) {
        const { data } = await api.put(`/api/cart/update/${itemId}`, { quantity });
        setCart(data);
      } else {
        setCart(cart.map((item) => (item.id === itemId ? { ...item, quantity } : item)));
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
    }
  };

  const removeCartItem = async (itemId) => {
    try {
      if (isAuthenticated) {
        const { data } = await api.delete(`/api/cart/remove/${itemId}`);
        setCart(data);
      } else {
        setCart(cart.filter((item) => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error removing cart item:', error);
    }
  };

  const clearCart = async () => {
    try {
      if (isAuthenticated) {
        await api.delete('/api/cart/clear');
      }
      setCart([]);
      localStorage.removeItem('anonymousCart');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  // Merge guest cart into user cart after login
  const migrateAnonymousCart = async () => {
    if (!cart.length) return;
    try {
      const formattedItems = cart.map(({ productId, quantity, size }) => ({
        productId, quantity, size,
      }));
      const { data } = await api.post('/api/cart/migrate', { anonymousCartItems: formattedItems });
      setCart(data.cart);
      localStorage.removeItem('anonymousCart');
    } catch (error) {
      console.error('Error migrating cart:', error);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      addToCart,
      updateCartItem,
      removeCartItem,
      clearCart,
      migrateAnonymousCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

export default CartContext;
