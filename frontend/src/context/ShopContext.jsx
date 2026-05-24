/**
 * ShopContext — compatibility layer over CartContext.
 *
 * Provides everything the legacy components still expect (cart, products,
 * currency, search state, navigate, getCartAmount …) so we don't have to
 * rewrite every consumer at once. New code should prefer useCart() or
 * individual context hooks directly.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from './ShoppingCartContext';
import api from '../utils/axios';

// ── Context ───────────────────────────────────────────────────────────────────
// Named export so legacy code that does useContext(ShopContext) keeps working.
export const ShopContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
// Must be rendered *inside* <CartProvider> (set up in App.jsx).
export const ShopProvider = ({ children }) => {
  const navigate = useNavigate();

  // Delegate all cart operations to CartContext
  const {
    cart,
    addToCart: cartAdd,
    updateCartItem,
    removeCartItem,
    clearCart,
  } = useCart();

  // ── Product catalogue ──────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get('/api/products')
      .then(({ data }) => setProducts(data))
      .catch((err) => console.error('ShopContext: failed to load products', err));
  }, []);

  // ── Search UI state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // ── Constants ──────────────────────────────────────────────────────────────
  const currency = '$';
  const delivery_fee = 5;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getProductById = (id) => products.find((p) => p.id === id) ?? null;

  const getCartAmount = () =>
    cart.reduce((total, item) => {
      const price = item.product?.price ?? item.price ?? 0;
      return total + price * (item.quantity || 1);
    }, 0);

  // Unified addToCart — works with both calling styles:
  //   addToCart(product, quantity, size)          ← ProductCard / BestSeller
  //   addToCart({ ...product, quantity, selectedSize }) ← Product.jsx
  const addToCart = (productOrItem, quantity, size) => {
    if (quantity === undefined && productOrItem?.selectedSize !== undefined) {
      const { selectedSize, quantity: qty = 1, ...product } = productOrItem;
      return cartAdd(product, qty, selectedSize ?? null);
    }
    return cartAdd(productOrItem, quantity ?? 1, size ?? null);
  };

  // ── Context value ──────────────────────────────────────────────────────────
  const value = {
    // Product catalogue
    products,
    getProductById,
    // Cart
    cart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    getCartAmount,
    // UI / display
    currency,
    delivery_fee,
    // Search
    search,
    setSearch,
    showSearch,
    setShowSearch,
    // Navigation (PlaceOrder.jsx reads navigate from context)
    navigate,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

// ── Custom hook ───────────────────────────────────────────────────────────────
// Returns safe defaults when used outside the provider (e.g. tests / Storybook).
export const useShopContext = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    return {
      products: [],
      getProductById: () => null,
      cart: [],
      addToCart: () => {},
      updateCartItem: () => {},
      removeCartItem: () => {},
      clearCart: () => {},
      getCartAmount: () => 0,
      currency: '$',
      delivery_fee: 5,
      search: '',
      setSearch: () => {},
      showSearch: false,
      setShowSearch: () => {},
      navigate: () => {},
    };
  }
  return ctx;
};

export default ShopContext;
