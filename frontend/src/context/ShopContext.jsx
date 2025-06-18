import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Create the context 
export const ShopContext = createContext();

// Custom hook for using the context
export const useShopContext = () => useContext(ShopContext);

export const ShopProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [currency, setCurrency] = useState('$');
  const initialLoadDone = useRef(false);
  const updatingCart = useRef(false);

  // Load cart from localStorage on initial render only
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const savedCart = localStorage.getItem('cart');
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          console.log('Loaded cart from localStorage:', parsedCart);
          setCart(parsedCart);
        }
      } catch (err) {
        console.error('Error parsing cart from localStorage:', err);
        // If there's an error parsing, clear the invalid data
        localStorage.removeItem('cart');
      }
    }
    
    // Fetch products when component mounts
    fetchProducts();
  }, []);

  // Save cart to localStorage whenever it changes, but avoid infinite loops
  useEffect(() => {
    if (updatingCart.current) return;
    
    // Don't run on first render
    if (!initialLoadDone.current) return;
    
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
      console.log('Cart updated in localStorage, items:', cart.length);
    } catch (err) {
      console.error('Error saving cart to localStorage:', err);
    }
  }, [cart]);

  // Function to fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Use the correct API endpoint for your project structure
      const response = await axios.get('http://localhost:5001/api/products');
      console.log('Products loaded successfully:', response.data.length);
      setProducts(response.data);
    } catch (err) {
      console.error('Error fetching products:', err);
      
      // If the first endpoint fails, try an alternative endpoint
      try {
        const response = await axios.get('http://localhost:5001/products');
        console.log('Products loaded from alternative endpoint:', response.data.length);
        setProducts(response.data);
      } catch (secondErr) {
        setError('Failed to load products');
        console.error('All product fetch attempts failed:', secondErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get product by ID
  const getProductById = useCallback((id) => {
    return products.find(product => product.id === id);
  }, [products]);

  // Get products by category
  const getProductsByCategory = useCallback((category) => {
    return products.filter(product => product.category === category);
  }, [products]);

  // Check if product is in stock
  const isProductInStock = useCallback((product, requestedSize = null) => {
    if (!product) return false;
    
    // If the product has sizes, check stock for specific size
    if (product.hasSizes && requestedSize) {
      const sizeInfo = product.productSizes?.find(s => s.size === requestedSize);
      return sizeInfo ? sizeInfo.stock > 0 : false;
    }
    
    // Otherwise check general stock
    return product.stock > 0;
  }, []);

  // Add item to cart
  const addToCart = useCallback((product, quantity = 1, selectedSize = null) => {
    if (!product) {
      console.error('Cannot add undefined product to cart');
      return;
    }
    
    const qty = parseInt(quantity) || 1;
    
    // Log for debugging
    console.log('Adding to cart:', { 
      id: product.id, 
      name: product.name, 
      price: product.price,
      quantity: qty,
      selectedSize
    });
    
    setCart(prevCart => {
      
      const updatedCart = [...prevCart];
      
      const existingItemIndex = updatedCart.findIndex(item => 
        item.id === product.id && 
        (selectedSize ? item.selectedSize === selectedSize : !item.selectedSize)
      );
      
      if (existingItemIndex >= 0) {
        const updatedItem = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + qty
        };
        updatedCart[existingItemIndex] = updatedItem;
      } else {
        updatedCart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: Array.isArray(product.imageUrl) ? product.imageUrl[0] : product.imageUrl,
          quantity: qty,
          selectedSize: selectedSize || null,
        });
      }
      
      console.log('Updated cart:', updatedCart);
      return updatedCart;
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity, size = null) => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) return;
    
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId && (size ? item.selectedSize === size : !item.selectedSize)) {
          return { ...item, quantity: qty };
        }
        return item;
      });
    });
  }, []);
  const removeFromCart = useCallback((itemId, selectedSize) => {
    const updatedCart = cart.filter(item => {
      const isMatch = selectedSize 
        ? item.id === itemId && item.selectedSize === selectedSize
        : item.id === itemId && !item.selectedSize;
      return !isMatch;
    });
    
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  }, [cart]);


  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  }, [cart]);

  const calculateSubtotal = useCallback(() => {
    return cart.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  }, [cart]);

  // Calculate tax
  const calculateTax = useCallback(() => {
    return calculateSubtotal() * 0.115
  }, [calculateSubtotal]);

  // Calculate total
  const calculateTotal = useCallback(() => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateTax() + (subtotal >= 100 ? 0 : 10);
  }, [calculateSubtotal, calculateTax]);

  
  const updateCartItemQuantity = (itemId, selectedSize, newQuantity) => {

    if (newQuantity <= 0) {
      removeFromCart(itemId, selectedSize);
      return;
    }
    

    setCart(prevCart => {
      return prevCart.map(item => {
        const isMatch = selectedSize 
          ? item.id === itemId && item.selectedSize === selectedSize
          : item.id === itemId && !item.selectedSize;
        
        if (isMatch) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
    
    const updatedCart = cart.map(item => {
      const isMatch = selectedSize 
        ? item.id === itemId && item.selectedSize === selectedSize
        : item.id === itemId && !item.selectedSize;
      
      if (isMatch) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const contextValue = React.useMemo(() => ({
    products,
    loading,
    error,
    cart,
    cartCount: cart.reduce((total, item) => total + item.quantity, 0),
    cartTotal: getCartTotal(),
    currency,
    setCurrency,
    getProductById,
    getProductsByCategory,
    isProductInStock,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    calculateSubtotal,
    calculateTax,
    calculateTotal,
    isAuthenticated,
    userId: currentUser?.id || null,
    userEmail: currentUser?.email || null,
    updateCartItemQuantity
  }), [
    products, 
    loading, 
    error, 
    cart, 
    currency,
    getProductById,
    getProductsByCategory,
    isProductInStock,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    calculateSubtotal,
    calculateTax,
    calculateTotal,
    isAuthenticated,
    currentUser
  ]);

  return (
    <ShopContext.Provider value={contextValue}>
      {children}
    </ShopContext.Provider>
  );
};

export default ShopContext;