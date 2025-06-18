import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Elements } from '@stripe/react-stripe-js';
import getStripe from "./utils/stripe";
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/ShoppingCartContext';

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Collection from "./pages/Collection";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/ShoppingCart";
//import Checkout from "./pages/Checkout";
import Product from "./pages/Product";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import PlaceOrder from "./pages/PlaceOrder";
import Orders from "./pages/Orders";
import SearchBar from "./components/SearchBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./components/AuthCallback";
import ProductManagement from "./pages/admin/ProductManagement";
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOverview from './pages/admin/AdminOverview';
import OrderManagement from './pages/admin/OrderManagement';
import { useAuth } from './context/AuthContext';
import NotFound from './pages/NotFound'; 
import UsersManagement from './pages/admin/UsersManagement';
import VerifyEmail from './pages/VerifyEmail';
import OrderConfirmation from './components/checkout/OrderConfirmation';
import OrderDetails from './pages/OrderDetails';
import Support from "./pages/Support";
import SupportTicketDetail from "./pages/SupportTicketDetail";
import SupportManagement from "./pages/admin/SupportManagement";
import AdminSupportTicketDetail from "./pages/admin/AdminSupportTicketDetail";
import Wishlist from "./pages/Wishlist";
import SearchResults from './pages/SearchResults';
import Analytics from './pages/admin/Analytics';
import Settings from './pages/admin/Settings';
import CheckoutRouter from './components/checkout/CheckoutRouter';
import AdminReports from './pages/admin/Reports'; // Adjust the path as needed
import AuthDebug from './components/AuthDebug';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Add Unauthorized component
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="mb-6">
        You don't have permission to access the admin area.
      </p>
      <button 
        onClick={() => window.history.back()} 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Go Back
      </button>
    </div>
  </div>
);

// Add this component at the top of your file:
const CheckoutSuccessRedirect = () => {
  const location = useLocation();
  const orderId = location.state?.orderId;
  const navigate = useNavigate();
  
  useEffect(() => {
    if (orderId) {
      navigate(`/order-confirmation/${orderId}`);
    } else {
      navigate('/');
    }
  }, [orderId, navigate]);
  
  return <div>Redirecting...</div>;
};

// Updated CheckoutWithStripe component with better error handling
const CheckoutWithStripe = () => {
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeError, setStripeError] = useState(null);

  useEffect(() => {
    const loadStripeInstance = async () => {
      try {
        const stripe = await getStripe();
        setStripePromise(stripe);
      } catch (error) {
        console.error("Error loading Stripe:", error);
        setStripeError("Failed to load payment processor. Please try again later.");
      }
    };
    
    loadStripeInstance();
  }, []);

  if (stripeError) {
    return (
      <div className="stripe-error">
        <h2>Payment Error</h2>
        <p>{stripeError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!stripePromise) {
    return <div>Loading payment processor...</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <Checkout />
    </Elements>
  );
};

// Layout component
const Layout = () => {
  return (
    <>
      <Navbar />
      <SearchBar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

// Protected route component for authenticated users
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Protected route component for admin users
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading admin access...</div>;
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

const App = () => {
  return (
      <AuthProvider>
        <CartProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="collection" element={<Collection />} />
                <Route path="collection/:category" element={<Collection />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="product/:id" element={<Product />} />
                <Route path="cart" element={<Cart/>} />
                {/* Updated with improved Stripe integration */}
                <Route path="/checkout" element={<CheckoutRouter />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="auth/callback" element={<AuthCallback />} />
                <Route path="verify-email" element={<VerifyEmail />} />
                <Route path="order-confirmation/:orderId" element={<OrderConfirmation />} />
                <Route path="orders/:orderId" element={<OrderDetails />} />
                <Route path="support" element={<Support />} />
                <Route path="support/:id" element={<SupportTicketDetail />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route
                  path="dashboard"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="place-order"
                  element={
                    <PrivateRoute>
                      <PlaceOrder />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <PrivateRoute>
                      <Orders />
                    </PrivateRoute>
                  }
                />
              </Route>
              
              {/* Admin routes - These will have a different layout */}
              <Route 
                path="/admin/*" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              >
                {/* These are nested routes that will render inside the AdminDashboard component */}
                <Route index element={<AdminOverview />} />
                <Route path="products" element={<ProductManagement />} />
                <Route path="orders" element={<OrderManagement />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="analytics" element={<Analytics />} /> {/* Add this line */}
                <Route path="support" element={<SupportManagement />} />
                <Route path="support/:id" element={<AdminSupportTicketDetail />} />
                <Route path="settings" element={<Settings />} /> {/* Make sure this exists */}
                <Route path="reports" element={<AdminReports />} /> {/* Add the new reports route here */}
              </Route>
              
              {/* 404 page */}
              <Route path="*" element={<NotFound />} />
              <Route path="/checkout/success" element={<CheckoutSuccessRedirect />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
            </Routes>
            
          </div>
        </CartProvider>
      </AuthProvider>
  );
};

export default App;