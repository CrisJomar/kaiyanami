import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
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
          // User is logged in - fetch their cart from the server
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:5001/api/cart', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setCart(response.data);
        } else {
          // User is not logged in - get cart from localStorage
          const localCart = localStorage.getItem('anonymousCart');
          if (localCart) {
            setCart(JSON.parse(localCart));
          }
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCart();
  }, [isAuthenticated, user?.id]);
  
  // Save anonymous cart to localStorage whenever it changes
  useEffect(() => {
    if (!isAuthenticated && cart.length > 0) {
      localStorage.setItem('anonymousCart', JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);
  
  // Add item to cart (different behavior based on auth status)
  const addToCart = async (product, quantity = 1, size = null) => {
    try {
      if (isAuthenticated) {
        // Add to server-side cart
        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5001/api/cart/add', 
          { productId: product.id, quantity, size },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Update local state with server response
        setCart(response.data);
      } else {
        // Add to client-side cart
        const existingItemIndex = cart.findIndex(item => 
          item.productId === product.id && item.size === size
        );
        
        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          const updatedCart = [...cart];
          updatedCart[existingItemIndex].quantity += quantity;
          setCart(updatedCart);
        } else {
          // Add new item
          setCart([...cart, {
            id: `temp-${Date.now()}`, // Temporary ID
            productId: product.id,
            product: product,
            quantity,
            size,
            price: product.price
          }]);
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };
  
  // Update cart item quantity
  const updateCartItem = async (itemId, quantity) => {
    try {
      if (isAuthenticated) {
        // Update on server
        const token = localStorage.getItem('token');
        const response = await axios.put(`http://localhost:5001/api/cart/update/${itemId}`, 
          { quantity },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setCart(response.data);
      } else {
        // Update in local storage
        const updatedCart = cart.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        );
        setCart(updatedCart);
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
    }
  };
  
  // Remove item from cart
  const removeCartItem = async (itemId) => {
    try {
      if (isAuthenticated) {
        // Remove on server
        const token = localStorage.getItem('token');
        const response = await axios.delete(`http://localhost:5001/api/cart/remove/${itemId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCart(response.data);
      } else {
        // Remove locally
        setCart(cart.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error removing cart item:', error);
    }
  };
  
  // Clear the entire cart
  const clearCart = async () => {
    try {
      if (isAuthenticated) {
        // Clear on server
        const token = localStorage.getItem('token');
        await axios.delete('http://localhost:5001/api/cart/clear', {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Always clear locally
      setCart([]);
      localStorage.removeItem('anonymousCart');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };
  
  // Migrate anonymous cart to user cart after login
  const migrateAnonymousCart = async () => {
    try {
      const anonymousItems = cart;
      if (!anonymousItems.length) return;
      
      const token = localStorage.getItem('token');
      
      // Format cart items for the API
      const formattedItems = anonymousItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size
      }));
      
      // Send to server for migration
      const response = await axios.post('http://localhost:5001/api/cart/migrate', 
        { anonymousCartItems: formattedItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update cart with server response
      setCart(response.data.cart);
      
      // Clear anonymous cart from localStorage
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
      migrateAnonymousCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

export default CartContext;