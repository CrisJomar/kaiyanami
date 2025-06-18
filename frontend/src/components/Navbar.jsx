import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaSearch, FaUser, FaBars, FaTimes, FaCog, FaExclamationTriangle, FaCheckCircle, FaHeart } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useShopContext } from '../context/ShopContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const Navbar = () => {
  const shopContext = useShopContext();
  const cart = shopContext?.cart || [];
  const currency = shopContext?.currency || "$";

  const { currentUser, isAuthenticated, logout, getUserDisplayName } = useAuth() || {};
  
  // Move the function inside the component
  const sendVerificationEmail = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You need to be logged in to verify your email');
        return;
      }
      
      const response = await axios.post(
        'http://localhost:5001/api/auth/send-verification', 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        toast.success('Verification email sent successfully. Please check your inbox.');
      } else {
        toast.error('Failed to send verification email. Please try again later.');
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(error.response?.data?.message || 'Failed to send verification email');
    }
  };

  // Rest of your existing variables
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Calculate cart count with safeguards
  const cartItemCount = Array.isArray(cart) 
    ? cart.reduce((count, item) => count + (item?.quantity || 0), 0) 
    : 0;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState({
    category: false,
    user: false,
  });

  // Refs for dropdowns
  const categoryRef = useRef(null);
  const userRef = useRef(null);

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Set the appropriate dashboard path based on user role
  const dashboardPath = isAdmin ? '/admin' : '/dashboard';

  // Total quantity of items in cart
  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setDropdownOpen(prev => ({ ...prev, category: false }));
      }

      if (userRef.current && !userRef.current.contains(event.target)) {
        setDropdownOpen(prev => ({ ...prev, user: false }));
      }
    }

    // Add when mounted
    document.addEventListener("mousedown", handleClickOutside);
    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Toggle dropdown
  const toggleDropdown = (name) => {
    setDropdownOpen(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Handle dropdown for mouse events
  const handleDropdownMouseEnter = (name) => {
    // Use a timeout to prevent accidental closing
    setTimeout(() => {
      setDropdownOpen(prev => ({ ...prev, [name]: true }));
    }, 50);
  };

  const handleDropdownMouseLeave = (name) => {
    // Add a delay before closing the dropdown
    setTimeout(() => {
      // Only close if we're not in a click-activated state
      if (!document.activeElement.closest(`.${name}-dropdown`)) {
        setDropdownOpen(prev => ({ ...prev, [name]: false }));
      }
    }, 500); // Increased delay to 500ms for more time to interact
  };

  // Debug effect to log user state
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User state:', currentUser);
      console.log('Verification conditions:', {
        provider: currentUser?.provider,
        isVerified: currentUser?.isVerified,
        emailVerified: currentUser?.emailVerified,
        showButton: currentUser?.provider === 'local' && !currentUser?.isVerified
      });
    }
  }, [currentUser, isAuthenticated]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Close search bar after search
      setSearchOpen(false);
      // If on mobile, close mobile menu too
      setMobileMenuOpen(false);
      // Navigate to search results page
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      // Clear the search input
      setSearchQuery('');
    }
  };

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 w-full z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img
              src="src/assets/logo.png"
              alt="Kaiyanami"
              className="h-12 w-auto"
              onError={(e) => {
                //e.target.src = 'https://via.placeholder.com/120x40?text=Kaiyanami';
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "px-3 py-2 text-medium font-medium text-indigo-600"
                  : "px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/collection"
              className={({ isActive }) =>
                isActive
                  ? "px-3 py-2 text-sm font-medium text-indigo-600"
                  : "px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
              }
            >
              Collection
            </NavLink>

            <NavLink
              to="/wishlist"
              className={({ isActive }) =>
                isActive
                  ? "px-3 py-2 text-sm font-medium text-indigo-600 flex items-center"
                  : "px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 flex items-center"
              }
            >
              <FaHeart className="mr-1" /> Wishlist
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive
                  ? "px-3 py-2 text-sm font-medium text-indigo-600"
                  : "px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
              }
            >
              About
            </NavLink>

            <NavLink
              to="/support"
              className={({ isActive }) =>
                isActive
                  ? "px-3 py-2 text-sm font-medium text-indigo-600"
                  : "px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
              }
            >
              Support
            </NavLink>
          </div>

          {/* Desktop Right Icons */}
          <div className="hidden md:flex items-center">
            {/* Search Icon */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-gray-700 hover:text-indigo-600"
            >
              <FaSearch />
            </button>

            {/* User/Account Icon with Dropdown */}
            <div
              className="relative mx-4 user-dropdown"
              ref={userRef}
              onMouseEnter={() => handleDropdownMouseEnter('user')}
              onMouseLeave={() => handleDropdownMouseLeave('user')}
            >
              <button
                className="p-2 text-gray-700 hover:text-indigo-600"
                onClick={() => toggleDropdown('user')}
              >
                <FaUser />
              </button>

              {dropdownOpen.user && (
                <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-lg z-50">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                        Hello, {currentUser?.firstName || currentUser?.email?.split('@')[0] || 'User'}
                      </div>

                      {/* Always visible debug button when logged in */}
                      {isAuthenticated && (
                        <button
                          onClick={() => {
                            console.log('Debug - User state:', currentUser);
                            sendVerificationEmail();
                            toggleDropdown('user');
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-200"
                        >
                          <div className="flex items-center">
                            <FaCheckCircle className="mr-2" />
                             Send Verification
                          </div>
                        </button>
                      )}

                      {/* Original verification button - which should appear conditionally */}
                      {currentUser?.provider === 'local' && !(currentUser?.isVerified || currentUser?.emailVerified) && (
                        <button
                          onClick={() => {
                            sendVerificationEmail();
                            toggleDropdown('user');
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 hover:text-orange-700 border-b border-gray-200"
                        >
                          <div className="flex items-center">
                            <FaExclamationTriangle className="mr-2" />
                            Verify Email
                          </div>
                        </button>
                      )}

                      {/* Admin Panel Link - Only show for admins */}
                      {isAdmin && (
                        <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
                          <div className="flex items-center">
                            <FaCog className="mr-2" />
                            Admin Panel
                          </div>
                        </Link>
                      )}

                      {/* My Account link redirects to dashboard based on user role */}
                      <Link to={dashboardPath} className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
                        My Account
                      </Link>
            
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
                        Login
                      </Link>
                      <Link to="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
                        Register
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cart Icon with Count Badge - Fixed to show correctly */}
            <div className="relative">
              <Link to="/cart" className="p-2 text-gray-700 hover:text-indigo-600">
                <FaShoppingCart size={20} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Link to="/cart" className="p-2 mr-4 text-gray-700 hover:text-indigo-600 relative">
              <FaShoppingCart />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 hover:text-indigo-600"
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="py-2 border-t border-gray-200">
            <form className="relative" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search for products..."
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <button type="submit" className="absolute right-3 top-2 text-indigo-600">
                Search
              </button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "block px-4 py-2 text-indigo-600 font-medium"
                  : "block px-4 py-2 text-gray-700 hover:text-indigo-600"
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </NavLink>

       

            <NavLink
              to="/collection"
              className={({ isActive }) =>
                isActive
                  ? "block px-4 py-2 text-indigo-600 font-medium"
                  : "block px-4 py-2 text-gray-700 hover:text-indigo-600"
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Collection
            </NavLink>

            <NavLink
              to="/wishlist"
              className={({ isActive }) =>
                isActive
                  ? "block px-4 py-2 text-indigo-600 font-medium flex items-center"
                  : "block px-4 py-2 text-gray-700 hover:text-indigo-600 flex items-center"
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaHeart className="mr-2" /> Wishlist
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive
                  ? "block px-4 py-2 text-indigo-600 font-medium"
                  : "block px-4 py-2 text-gray-700 hover:text-indigo-600"
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </NavLink>

            <NavLink
              to="/support"
              className={({ isActive }) =>
                isActive
                  ? "block px-4 py-2 text-indigo-600 font-medium"
                  : "block px-4 py-2 text-gray-700 hover:text-indigo-600"
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Support
            </NavLink>

            {/* Mobile User Section */}
            <div className="border-t border-gray-200 pt-2 mt-2">
              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2 text-sm font-medium text-gray-700">
                    Hello, {currentUser?.firstName || 'User'}
                  </div>

                  {/* Email verification for mobile */}
                  {currentUser?.provider === 'local' && !(currentUser?.isVerified || currentUser?.emailVerified) && (
                    <button
                      onClick={() => {
                        sendVerificationEmail();
                        setMobileMenuOpen(false); // Close menu after clicking
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-orange-600 hover:bg-orange-50 hover:text-orange-700 border-b border-gray-200"
                    >
                      <FaExclamationTriangle className="mr-2" />
                      Verify Email
                    </button>
                  )}

                  {/* Admin Panel Link - Only show for admins */}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center px-4 py-2 text-gray-700 hover:text-indigo-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FaCog className="mr-2" />
                      Admin Panel
                    </Link>
                  )}

                  {/* Update My Account link in mobile menu too */}
                  <Link
                    to={dashboardPath}
                    className="block px-4 py-2 text-gray-700 hover:text-indigo-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Account
                  </Link>
                  
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:text-indigo-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-4 py-2 text-gray-700 hover:text-indigo-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-2 text-gray-700 hover:text-indigo-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Search */}
            <div className="px-4 py-2 mt-2">
              <form className="relative" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <button type="submit" className="absolute right-3 top-2 text-indigo-600">
                  Search
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;