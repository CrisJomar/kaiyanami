import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

// ── Normalizer ────────────────────────────────────────────────────────────────
// DB cart items come back as { product: { name, price, … }, size, quantity, … }
// Many components expect flat fields (item.name, item.price, item.imageUrl).
// This function makes BOTH styles work without touching every consumer.
const normalize = (item) => {
  const p = item.product ?? {};
  return {
    ...item,
    // flat aliases — prefer existing top-level value, fall back to product.*
    name:               item.name               ?? p.name               ?? '',
    price:              item.price              ?? p.price              ?? 0,
    imageUrl:           item.imageUrl           ?? p.imageUrl           ?? [],
    discountPercentage: item.discountPercentage ?? p.discountPercentage ?? 0,
    // both 'size' (DB) and 'selectedSize' (legacy) point to the same value
    selectedSize:       item.selectedSize       ?? item.size            ?? null,
    size:               item.size               ?? item.selectedSize    ?? null,
  };
};

const normalizeAll = (items) => (Array.isArray(items) ? items.map(normalize) : []);

// ── Provider ──────────────────────────────────────────────────────────────────
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Helper: set cart with normalization applied
  const setNormalizedCart = (items) => setCart(normalizeAll(items));

  // ── Load cart ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        if (isAuthenticated) {
          const { data } = await api.get('/api/cart');
          setNormalizedCart(data);
        } else {
          const local = localStorage.getItem('anonymousCart');
          if (local) setNormalizedCart(JSON.parse(local));
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [isAuthenticated, user?.id]);

  // ── Persist guest cart ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated && cart.length > 0) {
      localStorage.setItem('anonymousCart', JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  // ── addToCart ──────────────────────────────────────────────────────────────
  const addToCart = async (product, quantity = 1, size = null) => {
    try {
      if (isAuthenticated) {
        const { data } = await api.post('/api/cart/add', { productId: product.id, quantity, size });
        setNormalizedCart(data);
      } else {
        const existingIndex = cart.findIndex(
          (item) => item.productId === product.id && item.size === size
        );
        if (existingIndex >= 0) {
          const updated = [...cart];
          updated[existingIndex] = normalize({
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          });
          setCart(updated);
        } else {
          setCart((prev) => [
            ...prev,
            normalize({
              id: `temp-${Date.now()}`,
              productId: product.id,
              product,
              quantity,
              size,
              selectedSize: size,
              price: product.price,
              name: product.name,
              imageUrl: product.imageUrl,
              discountPercentage: product.discountPercentage ?? 0,
            }),
          ]);
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // ── updateCartItem ─────────────────────────────────────────────────────────
  const updateCartItem = async (itemId, quantity) => {
    try {
      if (isAuthenticated) {
        const { data } = await api.put(`/api/cart/update/${itemId}`, { quantity });
        setNormalizedCart(data);
      } else {
        setCart((prev) =>
          prev.map((item) =>
            item.id === itemId ? normalize({ ...item, quantity }) : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
    }
  };

  // ── removeCartItem ─────────────────────────────────────────────────────────
  const removeCartItem = async (itemId) => {
    try {
      if (isAuthenticated) {
        const { data } = await api.delete(`/api/cart/remove/${itemId}`);
        setNormalizedCart(data);
      } else {
        setCart((prev) => prev.filter((item) => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error removing cart item:', error);
    }
  };

  // ── clearCart ──────────────────────────────────────────────────────────────
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

  // ── migrateAnonymousCart ───────────────────────────────────────────────────
  // Called after login to merge local cart into the DB cart.
  const migrateAnonymousCart = async () => {
    if (!cart.length) return;
    try {
      const formattedItems = cart.map(({ productId, quantity, size }) => ({
        productId,
        quantity,
        size,
      }));
      const { data } = await api.post('/api/cart/migrate', { anonymousCartItems: formattedItems });
      setNormalizedCart(data.cart);
      localStorage.removeItem('anonymousCart');
    } catch (error) {
      console.error('Error migrating cart:', error);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateCartItem,
        removeCartItem,
        clearCart,
        migrateAnonymousCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

export default CartContext;
