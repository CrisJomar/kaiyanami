import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
// Remove unused icons if necessary
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter } from 'react-icons/fa';

const ProductManagement = () => {
  // Add this state declaration with your other state variables at the top
  const [formErrors, setFormErrors] = useState({});
  
  // Your existing state variables
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [localCategoriesCache, setLocalCategoriesCache] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [limit] = useState(10);
  
  // UI states
  const [activeTab, setActiveTab] = useState('products'); // products, categories
  
  
  // Add these state declarations
  const [isEditing, setIsEditing] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    imageUrl: '',
    featured: false,
    discountPercentage: '',
    hasSizes: false,
    sizes: []
  });

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Clean up unused state variables
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [bulkActionValue, setBulkActionValue] = useState('');

  // Filter/sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Add these functions after your state declarations
  const saveCategoriesToStorage = (categories) => {
    try {
      const categoriesJson = JSON.stringify(categories);
      localStorage.setItem('admin_categories', categoriesJson);
      console.log('Categories saved to localStorage:', categories);
    } catch (err) {
      console.error('Error saving categories to localStorage:', err);
    }
  };

  const loadCategoriesFromStorage = () => {
    try {
      const saved = localStorage.getItem('admin_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('Loaded categories from localStorage:', parsed);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    }
    return [];
  };

  // Fix the fetchProducts function to use the correct endpoint
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortField,
        sortDirection
      });
      
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filterCategory) queryParams.append('category', filterCategory);
      
      console.log('Fetching products with params:', queryParams.toString());
      
      // Use the correct endpoint that matches your backend route definition
      const productsResponse = await axios.get(
        `http://localhost:5001/api/products/admin?${queryParams.toString()}`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Products API response:', productsResponse.data);
      
      // Check if we got the expected response structure
      if (productsResponse.data && Array.isArray(productsResponse.data.products)) {
        setProducts(productsResponse.data.products);
        setTotalProducts(productsResponse.data.total || 0);
        setTotalPages(Math.ceil((productsResponse.data.total || 0) / limit));
      } else {
        console.error('Unexpected API response format:', productsResponse.data);
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products: ' + (error.response?.data?.message || error.message));
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Replace your current fetchCategories function with this improved version
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Use the correct endpoint that matches your backend route definition
      const categoriesResponse = await axios.get('http://localhost:5001/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Raw Categories API response:', categoriesResponse.data);
      
      // Ensure we always have a valid array to work with
      let categoriesData = categoriesResponse.data || [];
      
      // If we got categories from API, use them
      if (Array.isArray(categoriesData) && categoriesData.length > 0) {
        const normalizedCategories = categoriesData.map(cat => 
          typeof cat === 'string' ? { name: cat, id: cat } : cat
        );
        setCategories(normalizedCategories);
        setLocalCategoriesCache(normalizedCategories);
        // Save to localStorage
        saveCategoriesToStorage(normalizedCategories);
        console.log('Categories updated from API:', normalizedCategories);
      } else {
        // If API returned an empty array but we have cached categories, use those
        if (localCategoriesCache.length > 0) {
          setCategories(localCategoriesCache);
          console.log('Using cached categories:', localCategoriesCache);
        } else {
          // Otherwise, ensure we at least have an Uncategorized category
          const defaultCategories = [{ name: 'Uncategorized', id: 'uncategorized', count: 0 }];
          setCategories(defaultCategories);
          setLocalCategoriesCache(defaultCategories);
          // Save to localStorage
          saveCategoriesToStorage(defaultCategories);
          console.log('Using default categories:', defaultCategories);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // If API call fails but we have cached categories, use those
      if (localCategoriesCache.length > 0) {
        setCategories(localCategoriesCache);
        console.log('Using cached categories after API error:', localCategoriesCache);
      } else {
    // Otherwise, ensure we at least have an Uncategorized category
    const defaultCategories = [{ name: 'Uncategorized', id: 'uncategorized', count: 0 }];
    setCategories(defaultCategories);
    setLocalCategoriesCache(defaultCategories);
    // Save to localStorage
    saveCategoriesToStorage(defaultCategories);
    console.log('Using default categories after API error:', defaultCategories);
      }
      toast.error('Failed to load categories');
    }
  };

  // Products fetch effect - add products whenever the filters change
  useEffect(() => {
    console.log("Filter changed:", {
      searchTerm,
      filterCategory,
      sortField,
      sortDirection,
      currentPage,
      limit
    });
    fetchProducts();
  }, [currentPage, limit, searchTerm, filterCategory, sortField, sortDirection]);

  // Replace your existing useEffect for categories loading
  useEffect(() => {
    // First try to load from localStorage
    const savedCategories = loadCategoriesFromStorage();
    if (savedCategories.length > 0) {
      setCategories(savedCategories);
      setLocalCategoriesCache(savedCategories);
    }
    
    // Then fetch from API
    fetchCategories();
  }, []);

  

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
  
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  
    // Update single field validation
    validateField(name, newValue);
  };

  // Update the handleAddProduct function to include validation
const handleAddProduct = async () => {
  try {
    console.log("Starting handleAddProduct");
    console.log("Initial formData:", formData);
    
    // Perform validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      toast.error('Please fix the errors in the form before submitting');
      return;
    }
    
    // Rest of your existing handleAddProduct code
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found');
      return;
    }
    
    // Format data with proper types
    const productData = {
      name: formData.name,
      description: formData.description || '',
      price: parseFloat(formData.price),
      categoryName: formData.category,
      imageUrl: formData.imageUrl ? 
                (Array.isArray(formData.imageUrl) ? 
                  formData.imageUrl : 
                  [formData.imageUrl]) : 
                [],
      stock: formData.hasSizes ? 0 : parseInt(formData.stock || '0', 10),
      featured: !!formData.featured,
      discountPercentage: parseFloat(formData.discountPercentage || '0'),
      hasSizes: !!formData.hasSizes,
      sizes: formData.hasSizes ? formData.sizes.map(item => ({
        size: item.size,
        stock: parseInt(String(item.stock), 10) || 0
      })) : []
    };
    
    console.log("Prepared product data:", JSON.stringify(productData, null, 2));

    const response = await axios.post(
      'http://localhost:5001/api/products', 
      productData, 
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("Backend response:", response.data);
    
    // Reset form and close modal
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      stock: '',
      imageUrl: '',
      featured: false,
      discountPercentage: '',
      hasSizes: false,
      sizes: []
    });
    setFormErrors({});
    setShowForm(false);
    
    fetchProducts();
    toast.success('Product added successfully');
    
  } catch (error) {
    console.error('Error adding product:', error);
    if (error.response && error.response.data) {
      console.error('Server error details:', error.response.data);
      toast.error('Failed to add product: ' + (error.response.data.message || 'Unknown error'));
    } else {
      toast.error('Failed to add product. Please try again.');
    }
  }
};

// Update the handleUpdateProduct function to include validation
const handleUpdateProduct = async () => {
  try {
    console.log("Starting handleUpdateProduct");
    console.log("Form data for update:", formData);
    
    // Perform validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      toast.error('Please fix the errors in the form before submitting');
      return;
    }
    
    // Rest of your existing handleUpdateProduct code
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found');
      return;
    }
    
    // Format data with proper types
    const productData = {
      name: formData.name,
      description: formData.description || '',
      price: parseFloat(formData.price),
      categoryName: formData.category,
      imageUrl: formData.imageUrl ? 
                (Array.isArray(formData.imageUrl) ? 
                  formData.imageUrl : 
                  [formData.imageUrl]) : 
                [],
      stock: formData.hasSizes ? 0 : parseInt(formData.stock || '0', 10),
      featured: !!formData.featured,
      discountPercentage: parseFloat(formData.discountPercentage || '0'),
      hasSizes: !!formData.hasSizes,
      sizes: formData.hasSizes && Array.isArray(formData.sizes) 
        ? formData.sizes.map(item => ({
            size: item.size || '',
            stock: parseInt(String(item.stock || '0'), 10)
          })) 
        : []
    };
    
    console.log("Prepared product data for update:", JSON.stringify(productData, null, 2));
    
    const response = await axios.put(
      `http://localhost:5001/api/products/${currentProductId}`, 
      productData, 
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("Update response:", response.data);
    
    // Close form but DON'T reset form data here
    setShowForm(false);
    setIsEditing(false);
    setCurrentProductId(null);
    setFormErrors({});
    
    // Only AFTER closing the form and resetting edit state, clear the form data
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      stock: '',
      imageUrl: '',
      featured: false,
      discountPercentage: '',
      hasSizes: false,
      sizes: []
    });
    
    fetchProducts();
    toast.success('Product updated successfully');
    
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.response && error.response.data) {
      console.error('Server error details:', error.response.data);
      toast.error('Failed to update product: ' + (error.response.data.message || 'Unknown error'));
    } else {
      toast.error('Failed to update product. Please try again.');
    }
  }
};

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }
      
      // Use the correct endpoint that matches your backend route definition
      await axios.delete(
        `http://localhost:5001/api/products/${productId}`, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Refresh products
      fetchProducts();
      toast.success('Product deleted successfully');
      
    } catch (error) {
      console.error('Error deleting product:', error);
      
      // Check for specific error cases
      if (error.response && error.response.status === 400) {
        if (error.response.data.cartCount > 0) {
          setError(`Cannot delete: This product is in ${error.response.data.cartCount} users' carts`);
        } else {
          setError('Cannot delete this product: ' + (error.response?.data?.message || 'Unknown error'));
        }
      } else {
        setError('Failed to delete product. Please try again.');
      }
    }
  };

  // Replace your handleAddCategory function
  const handleAddCategory = async () => {
    try {
      // Use categoryFormData.name instead of formData.categoryName
      if (!categoryFormData.name) {
        toast.error('Category name is required');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You must be logged in');
        return;
      }
      
      console.log("Creating category:", categoryFormData.name);
      
      const response = await axios.post(
        'http://localhost:5001/api/categories',
        { name: categoryFormData.name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log("API response:", response.data);
      
      // Add the new category to the state
      const newCategory = response.data;
      const updatedCategories = [...categories, newCategory];
      
      // Update both state and localStorage
      setCategories(updatedCategories);
      setLocalCategoriesCache(updatedCategories);
      saveCategoriesToStorage(updatedCategories);
      
      toast.success(`Category "${categoryFormData.name}" created!`);
      setCategoryFormData({ name: '' });
      setShowCategoryModal(false);
    } catch (error) {
      console.error('Error creating category:', error);
      if (error.response) {
        toast.error(`Error: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        toast.error('Server did not respond. Check your connection.');
      } else {
        toast.error(`Error: ${error.message}`);
      }
    }
  };

  // Edit category name - replace your current function with this one
  const handleEditCategory = async () => {
    try {
      if (!categoryFormData.name.trim() || !editingCategory) {
        toast.error('Category name is required');
        return;
      }
      
      console.log(`Updating category: "${editingCategory}" to "${categoryFormData.name}"`);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        return;
      }
      
      const config = {
        headers: { 'Authorization': `Bearer ${token}` }
      };
      
      // IMPORTANT: Use the correct URL path - match what your backend expects
      const response = await axios.put(
        `http://localhost:5001/api/categories/${encodeURIComponent(editingCategory)}`, 
        { name: categoryFormData.name },
        config
      );
      
      console.log('Update response:', response.data);
      
      // Update state directly without fetching
      const updatedCategories = categories.map(cat => 
        (typeof cat === 'object' && cat.name === editingCategory) ? response.data : cat
      );
      
      // Set categories and save to localStorage
      setCategories(updatedCategories);
      setLocalCategoriesCache(updatedCategories);
      saveCategoriesToStorage(updatedCategories);
      
      toast.success('Category updated successfully');
      setShowCategoryModal(false);
      setCategoryFormData({ name: '' });
      setEditingCategory(null);
    } catch (err) {
      console.error('Error updating category:', err);
      console.error('Error details:', err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!categoryName) {
      console.error('Category name is undefined');
      toast.error('Invalid category');
      return;
    }
    
    console.log(`Attempting to delete category: "${categoryName}"`);
    
    if (window.confirm(`Are you sure you want to delete the category "${categoryName}"? Products will be moved to "Uncategorized".`)) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Authentication token not found. Please login again.');
          return;
        }
        
        const config = {
          headers: { 'Authorization': `Bearer ${token}` }
        };
        
        // IMPORTANT: Use the correct URL path
        await axios.delete(
          `http://localhost:5001/api/categories/${encodeURIComponent(categoryName)}`,
          config
        );
        
        // Update state directly without fetching
        const updatedCategories = categories.filter(cat => cat.name !== categoryName);
        setCategories(updatedCategories);
        setLocalCategoriesCache(updatedCategories);
        // Save to localStorage
        saveCategoriesToStorage(updatedCategories);
        
        toast.success('Category deleted successfully');
      } catch (err) {
        console.error('Error deleting category:', err);
        toast.error(err.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  // Replace handleImageUpload function with this complete version
  const handleImageUpload = async (file) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      
      // Changed URL from /api/products/upload to /api/upload
      const response = await axios.post('http://localhost:5001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Upload response:", response.data);
      
      if (response.data && response.data.url) {
        toast.success("Image uploaded successfully");
        return response.data.url;
      } else {
        console.error("Invalid response format:", response.data);
        toast.error("Invalid response from server");
        throw new Error("Invalid image upload response");
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error("Failed to upload image. Please try again.");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Add these functions after your existing handlers
  const handleBulkSelection = (productId, isSelected) => {
    if (isSelected) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAllProducts = (isSelected) => {
    if (isSelected) {
      setSelectedProducts(products.map(product => product.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkAction = async () => {
    if (selectedProducts.length === 0) {
      setError('No products selected');
      return;
    }
    
    if (bulkAction === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          return;
        }
        
        await axios.post(
          'http://localhost:5001/api/admin/products/bulk-delete', 
          { productIds: selectedProducts },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Reset selections and refresh products
        setSelectedProducts([]);
        fetchProducts();
        
      } catch (error) {
        console.error('Error performing bulk delete:', error);
        setError('Failed to delete products. Some products may be in orders or carts.');
      }
    } else if (bulkAction === 'stock') {
      try {
        const stock = parseInt(bulkActionValue);
        if (isNaN(stock) || stock < 0) {
          setError('Stock must be a valid number greater than or equal to 0');
          return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          return;
        }
        
        await axios.post(
          'http://localhost:5001/api/admin/products/bulk-update-stock', 
          { 
            productIds: selectedProducts,
            stock
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Reset form and refresh products
        setSelectedProducts([]);
        setBulkActionValue('');
        setShowBulkActionModal(false);
        fetchProducts();
        
      } catch (error) {
        console.error('Error updating stock:', error);
        setError('Failed to update stock. Please try again.');
      }
    }
  };

  const handleEditClick = (product) => {
    console.log("Editing product:", product);
    
    // Create a properly formatted form data object from the product
    const formattedData = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category?.name || product.category || '', // Handle both object and string
      stock: product.hasSizes ? 0 : (product.stock || 0),
      featured: !!product.featured,
      discountPercentage: product.discountPercentage || 0,
      imageUrl: product.imageUrl || [],
      hasSizes: !!product.hasSizes,
      // IMPORTANT: Map from productSizes array instead of sizes
      sizes: Array.isArray(product.productSizes) && product.productSizes.length > 0 
        ? product.productSizes.map(sizeItem => ({
            size: sizeItem.size || sizeItem.name || '',
            stock: parseInt(sizeItem.stock || '0', 10)
          })) 
        : Array.isArray(product.sizes) && product.sizes.length > 0
          ? product.sizes.map(sizeItem => ({
              size: sizeItem.size || sizeItem.name || '',
              stock: parseInt(sizeItem.stock || '0', 10)
            }))
          : []
    };
    
    console.log("Formatted form data:", formattedData);
    
    // Set the form data
    setFormData(formattedData);
    setIsEditing(true);
    setCurrentProductId(product.id);
    setShowForm(true);
    
    // Scroll to the form
    setTimeout(() => {
      document.getElementById('productForm')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Update this function
  const createCategoryDirectly = async () => {
    try {
      if (!newCategoryName.trim()) {
        toast.error('Category name is required');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      console.log("Creating category:", newCategoryName);
      
      // IMPORTANT: Use the CORRECT endpoint
      const response = await axios.post(
        'http://localhost:5001/api/categories',  // This matches your backend route
        { name: newCategoryName.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log("Category creation response:", response.data);
      
      if (response.data) {
        // Add to both state and cache
        const newCategory = response.data;
        const updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
        setLocalCategoriesCache(updatedCategories);
        // Save to localStorage
        saveCategoriesToStorage(updatedCategories);
        
        toast.success(`Category "${newCategoryName}" created!`);
        setNewCategoryName('');
        
        // Return the new category in case we want to use it
        return newCategory;
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(error.response?.data?.message || 'Failed to create category');
      return null;
    }
  };

  // Add or update these handler functions in your component:

  const handleAddSize = () => {
    setFormData({
      ...formData,
      sizes: [...(formData.sizes || []), { size: '', stock: 0 }]
    });
  };

  const handleRemoveSize = (index) => {
    const updatedSizes = [...formData.sizes];
    updatedSizes.splice(index, 1);
    setFormData({
      ...formData,
      sizes: updatedSizes
    });
  };

  const handleSizeChange = (index, field, value) => {
    const updatedSizes = [...formData.sizes];
    updatedSizes[index] = {
      ...updatedSizes[index],
      [field]: value
    };
  
    // Update form data
    setFormData({
      ...formData,
      sizes: updatedSizes
    });
  
    // Validate the size
    validateSizeField(index, field, value);
  };

  // Add these validation functions before your return statement

// Validate all fields in the form
const validateForm = () => {

  if (!formData) return {};

  // Ensure sizes is always an array
  const sizesArray = Array.isArray(formData.sizes) ? formData.sizes : [];

  const errors = {};
  
  // Name validation
  if (!formData.name.trim()) {
    errors.name = "Product name is required";
  } else if (formData.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  } else if (formData.name.trim().length > 100) {
    errors.name = "Name must be 100 characters or less";
  }
  
  // Price validation
  if (!formData.price) {
    errors.price = "Price is required";
  } else {
    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue)) {
      errors.price = "Price must be a valid number";
    } else if (priceValue <= 0) {
      errors.price = "Price must be greater than 0";
    } else if (priceValue > 9999999) { // Practical upper limit
      errors.price = "Price is too high";
    }
  }
  
  // Category validation
  if (!formData.category) {
    errors.category = "Category is required";
  }
  
  // Stock validation (if not using sizes)
  if (!formData.hasSizes) {
    if (formData.stock === "") {
      errors.stock = "Stock quantity is required";
    } else {
      const stockValue = parseInt(formData.stock, 10);
      if (isNaN(stockValue)) {
        errors.stock = "Stock must be a valid number";
      } else if (stockValue < 0) {
        errors.stock = "Stock cannot be negative";
      } else if (stockValue > 999999) { // Practical upper limit
        errors.stock = "Stock value is too high";
      }
    }
  }
  
  // Discount validation
  if (formData.discountPercentage !== "") {
    const discountValue = parseFloat(formData.discountPercentage);
    if (isNaN(discountValue)) {
      errors.discountPercentage = "Discount must be a valid number";
    } else if (discountValue < 0) {
      errors.discountPercentage = "Discount cannot be negative";
    } else if (discountValue > 100) {
      errors.discountPercentage = "Discount cannot exceed 100%";
    }
  }
  
  // Sizes validation
  if (formData.hasSizes) {
    if (!formData.sizes || formData.sizes.length === 0) {
      errors.sizes = "At least one size is required";
    } else {
      const sizeErrors = [];
      const sizeNames = new Set();
      
      formData.sizes.forEach((sizeItem, index) => {
        const itemErrors = {};
        
        // Check for duplicate size names
        if (sizeItem.size && sizeNames.has(sizeItem.size.toUpperCase())) {
          itemErrors.size = "Duplicate size";
        } else if (sizeItem.size) {
          sizeNames.add(sizeItem.size.toUpperCase());
        }
        
        // Size name validation
        if (!sizeItem.size) {
          itemErrors.size = "Size name is required";
        } else if (sizeItem.size.length > 20) {
          itemErrors.size = "Size name is too long";
        }
        
        // Size stock validation
        const stockValue = parseInt(sizeItem.stock, 10);
        if (sizeItem.stock === "" || isNaN(stockValue)) {
          itemErrors.stock = "Stock is required";
        } else if (stockValue < 0) {
          itemErrors.stock = "Cannot be negative";
        } else if (stockValue > 999999) {
          itemErrors.stock = "Value is too high";
        }
        
        if (Object.keys(itemErrors).length > 0) {
          sizeErrors[index] = itemErrors;
        }
      });
      
      if (sizeErrors.length > 0) {
        errors.sizeItems = sizeErrors;
      }
    }
  }
  
  return errors;
};

// Validate a single field
const validateField = (name, value) => {
  let error = '';
  
  switch (name) {
    case 'name':
      if (!value.trim()) {
        error = "Product name is required";
      } else if (value.trim().length < 2) {
        error = "Name must be at least 2 characters";
      } else if (value.trim().length > 100) {
        error = "Name must be 100 characters or less";
      }
      break;
      
    case 'price':
      if (!value) {
        error = "Price is required";
      } else {
        const priceValue = parseFloat(value);
        if (isNaN(priceValue)) {
          error = "Price must be a valid number";
        } else if (priceValue <= 0) {
          error = "Price must be greater than 0";
        } else if (priceValue > 9999999) {
          error = "Price is too high";
        }
      }
      break;
      
    case 'category':
      if (!value) {
        error = "Category is required";
      }
      break;
      
    case 'stock':
      if (formData.hasSizes) {
        // Skip validation if using sizes
        break;
      }
      
      if (value === "") {
        error = "Stock quantity is required";
      } else {
        const stockValue = parseInt(value, 10);
        if (isNaN(stockValue)) {
          error = "Stock must be a valid number";
        } else if (stockValue < 0) {
          error = "Stock cannot be negative";
        } else if (stockValue > 999999) {
          error = "Stock value is too high";
        }
      }
      break;
      
    case 'discountPercentage':
      if (value !== "") {
        const discountValue = parseFloat(value);
        if (isNaN(discountValue)) {
          error = "Discount must be a valid number";
        } else if (discountValue < 0) {
          error = "Discount cannot be negative";
        } else if (discountValue > 100) {
          error = "Discount cannot exceed 100%";
        }
      }
      break;
      
    default:
      break;
  }
  
  setFormErrors(prev => ({
    ...prev,
    [name]: error
  }));
};

// Validate a single size field
const validateSizeField = (index, field, value) => {
  let error = '';
  
  if (field === 'size') {
    if (!value) {
      error = "Size name is required";
    } else if (value.length > 20) {
      error = "Size name is too long";
    }
    
    // Check for duplicate sizes
    const sizeNames = formData.sizes.map(s => s.size?.toUpperCase());
    const currentUpperCase = value.toUpperCase();
    const duplicateIndex = sizeNames.findIndex((name, i) => i !== index && name === currentUpperCase);
    
    if (duplicateIndex !== -1) {
      error = "Duplicate size";
    }
  } else if (field === 'stock') {
    const stockValue = parseInt(value, 10);
    if (value === "" || isNaN(stockValue)) {
      error = "Stock is required";
    } else if (stockValue < 0) {
      error = "Cannot be negative";
    } else if (stockValue > 999999) {
      error = "Value is too high";
    }
  }
  
  setFormErrors(prev => {
    const sizeErrors = {...(prev.sizeItems || {})};
    if (!sizeErrors[index]) {
      sizeErrors[index] = {};
    }
    
    sizeErrors[index][field] = error;
    
    return {
      ...prev,
      sizeItems: sizeErrors
    };
  });
};

  // Placeholder for the UI
  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Product Management</h1>
      
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('products')}
            className={`${
              activeTab === 'products'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm sm:text-base`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm sm:text-base`}
          >
            Categories
          </button>
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium">
          {activeTab === 'products' ? 'Product List' : 'Product Categories'}
        </h2>
        <button
         onClick={() => {
          setFormData({
            name: '',
            description: '',
            price: '',
            category: '',
            stock: '',
            imageUrl: '',
            featured: false,
            hasSizes: false, 
            sizes: []
          });
          setIsEditing(false);
          setShowForm(true);
        }}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          {activeTab === 'products' ? 'Add Product' : 'Add Category'}
        </button>
      </div>

      {/* Add this to your component's return statement, near the top of the products section */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
              placeholder="Search by name or description..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1); // Reset to first page when changing filter
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option key="all" value="">All Categories</option>
            {categories && categories.length > 0 ? (
              categories.map((category) => (
                <option 
                  key={typeof category === 'string' ? category : (category.id || category.name)} 
                  value={typeof category === 'string' ? category : category.name}
                >
                  {typeof category === 'string' ? category : category.name}
                </option>
              ))
            ) : (
              <option key="no-categories" disabled>No categories found</option>
            )}
          </select>
        </div>

        {/* Sort field */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select
            value={sortField}
            onChange={(e) => {
              setSortField(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option key="name" value="name">Name</option>
            <option key="price" value="price">Price</option>
            <option key="createdAt" value="createdAt">Creation Date</option>
            <option key="updatedAt" value="updatedAt">Last Updated</option>
          </select>
        </div>

        {/* Sort direction */}
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
          <select
            value={sortDirection}
            onChange={(e) => {
              setSortDirection(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option key="asc" value="asc">Ascending</option>
            <option key="desc" value="desc">Descending</option>
          </select>
        </div>

        {/* Clear filters button */}
        {(searchTerm || filterCategory) && (
          <button
            onClick={() => {
              // Reset all filters
              setSearchTerm('');
              setFilterCategory('');
              setSortField('updatedAt');
              setSortDirection('desc');
              setCurrentPage(1);
              
              // Then fetch products with reset filters (after state updates)
              setTimeout(() => fetchProducts(), 0);
            }}
            className="inline-flex items-center h-10 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Filters
          </button>
        )}

        {/* Apply filters button */}
        <button
          onClick={fetchProducts}
          className="inline-flex items-center h-10 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Apply Filters
        </button>
      </div>

      {/* Product Table */}
      {activeTab === 'products' && !isLoading && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.imageUrl && (
                          <div className="flex-shrink-0 h-10 w-10 mr-4">
                            <img className="h-10 w-10 rounded-full object-cover" src={product.imageUrl} alt={product.name} />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.featured && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category?.name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${Number(product.price).toFixed(2)}</div>
                      {product.discountPercentage > 0 && (
                        <div className="text-xs text-red-600">
                          -{product.discountPercentage}% (${(Number(product.price) * (1 - product.discountPercentage / 100)).toFixed(2)})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.hasSizes && product.sizes && product.sizes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.sizes.map((sizeItem, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {sizeItem.size}: {sizeItem.stock}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.stock === 0
                            ? 'bg-red-100 text-red-800'
                            : product.stock < 10
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {products.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
      )}

      {activeTab === 'products' && !isLoading && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => prev < totalPages ? prev + 1 : prev)}
              disabled={currentPage >= totalPages}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
          
          {/* Desktop pagination */}
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{Math.min((currentPage - 1) * limit + 1, totalProducts)}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * limit, totalProducts)}</span> of{' '}
                <span className="font-medium">{totalProducts}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                {/* Previous button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {totalPages <= 7 ? (
                  [...Array(totalPages)].map((_, i) => (
                    <button
                      key={`page-${i+1}`}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}
                    >
                      {i + 1}
                    </button>
                  ))
                ) : (
                  <>
                    {currentPage > 3 && (
                      <button
                        key="page-1"
                        onClick={() => setCurrentPage(1)}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        1
                      </button>
                    )}
                    
                    {currentPage > 4 && (
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                        ...
                      </span>
                    )}
                    
                    {[...Array(5)].map((_, i) => {
                      const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages));
                      if (pageNum > 1 && pageNum < totalPages) {
                        return (
                          <button
                            key={`page-${pageNum}`}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                    
                    {currentPage < totalPages - 3 && (
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                        ...
                      </span>
                    )}
                    
                    {currentPage < totalPages - 2 && (
                      <button
                        key={`page-${totalPages}`}
                        onClick={() => setCurrentPage(totalPages)}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        {totalPages}
                      </button>
                    )}
                  </>
                )}
                
                {/* Next button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}


      {/* Category List */}
      {activeTab === 'categories' && !isLoading && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.name}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {category.count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          // Get the name from the category object or directly use the category if it's a string
                          const categoryName = typeof category === 'string' ? category : category.name;
                          console.log("Edit category:", categoryName);
                          setEditingCategory(categoryName);
                          setCategoryFormData({ name: categoryName });
                          setShowCategoryModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          const categoryName = typeof category === 'string' ? category : category.name;
                          handleDeleteCategory(categoryName);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                      No categories found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {activeTab === 'categories' && (
        <div className="mb-6 p-4 bg-white shadow-md rounded-lg">
          <h3 className="font-medium mb-2">Quick Add Category</h3>
          <div className="flex">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter category name"
            />
            <button
              onClick={createCategoryDirectly}
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {showForm && (
  <div className="fixed inset-0 overflow-y-auto z-50">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 transition-opacity" aria-hidden="true">
        <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
      
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4" id="productForm">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h3>
              
              <div className="mt-4 space-y-4">
                {/* Product name field with validation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className={`mt-1 block w-full border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Product name"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                {/* Description field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Product description"
                  ></textarea>
                </div>

                {/* Price and stock fields with validation */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="text"
                        name="price"
                        value={formData.price}
                        onChange={handleFormChange}
                        className={`block w-full pl-7 pr-12 border ${formErrors.price ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="0.00"
                      />
                    </div>
                    {formErrors.price && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stock</label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleFormChange}
                      className={`mt-1 block w-full border ${formErrors.stock ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="0"
                      min="0"
                      disabled={formData.hasSizes}
                    />
                    {formErrors.stock && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.stock}</p>
                    )}
                  </div>
                </div>

                {/* Category field with validation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className={`mt-1 block w-full border ${formErrors.category ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option key="empty" value="">Select category</option>
                    <option key="uncategorized" value="Uncategorized">Uncategorized</option>
                    {categories && categories.length > 0 ? (
                      categories.map((category, index) => {
                        const categoryName = typeof category === 'object' ? category.name : category;
                        const categoryId = typeof category === 'object' ? category.id : `cat-${index}`;
                        
                        return (
                          <option key={`${categoryId}-${index}`} value={categoryName}>
                            {categoryName}
                          </option>
                        );
                      })
                    ) : null}
                  </select>
                  {formErrors.category && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
                  )}
                </div>

                {/* Image URL field with validation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Image</label>
                  <div className="mt-1 flex items-center">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={formData.imageUrl} 
                          alt="Product preview" 
                          className="h-32 w-32 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, imageUrl: ''})}
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current.click()}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Upload Image'}
                        </button>
                        <span className="text-sm text-gray-500">or</span>
                        <input
                          type="text"
                          name="imageUrl"
                          value={formData.imageUrl}
                          onChange={handleFormChange}
                          className={`flex-1 border ${formErrors.imageUrl ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    )}
                  </div>
                  {formErrors.imageUrl && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.imageUrl}</p>
                  )}
                </div>

                {/* Discount percentage field with validation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount Percentage</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="discountPercentage"
                      value={formData.discountPercentage}
                      onChange={handleFormChange}
                      className={`block w-full pr-12 border ${formErrors.discountPercentage ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="0"
                      min="0"
                      max="99"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                  {formErrors.discountPercentage && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.discountPercentage}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    {formData.discountPercentage > 0 && formData.price && !formErrors.price && (
                      <>
                        Original: ${parseFloat(formData.price || 0).toFixed(2)}, 
                        After discount: ${(parseFloat(formData.price || 0) * (1 - parseInt(formData.discountPercentage || 0) / 100)).toFixed(2)}
                      </>
                    )}
                  </p>
                </div>

                {/* Featured checkbox */}
                <div className="flex items-center">
                  <input
                    id="featured"
                    name="featured"
                    type="checkbox"
                    checked={formData.featured}
                    onChange={handleFormChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">
                    Featured product
                  </label>
                </div>

                {/* Has sizes section with validation */}
                <div className="mt-4">
                  <div className="flex items-center">
                    <input
                      id="hasSizes"
                      name="hasSizes"
                      type="checkbox"
                      checked={formData.hasSizes}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="hasSizes" className="ml-2 block text-sm text-gray-900">
                      This product has multiple sizes
                    </label>
                  </div>
                  
                  {formData.hasSizes && (
                    <div className="mt-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">Available Sizes</h4>
                        <button
                          type="button"
                          onClick={() => {
                            const standardSizes = ['S', 'M', 'L', 'XL'].map(size => ({
                              size,
                              stock: 10
                            }));
                            
                            // Filter out any sizes that already exist
                            const newSizes = standardSizes.filter(
                              s => !formData.sizes.some(existing => existing.size === s.size)
                            );
                            
                            setFormData({
                              ...formData, 
                              sizes: [...(formData.sizes || []), ...newSizes]
                            });
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          + Add Standard Sizes (S, M, L, XL)
                        </button>
                      </div>
                      
                      {formErrors.sizes && (
                        <p className="text-sm text-red-600">{formErrors.sizes}</p>
                      )}
                      
                      <div className="overflow-hidden border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {formData.sizes.map((sizeItem, index) => {
                              // Get error object for this size item if it exists
                              const sizeError = formErrors.sizeItems && formErrors.sizeItems[index];
                              
                              return (
                                <tr key={index}>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <input
                                      type="text"
                                      value={sizeItem.size}
                                      onChange={(e) => handleSizeChange(index, 'size', e.target.value)}
                                      className={`block w-20 border ${sizeError && sizeError.size ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                      placeholder="Size"
                                    />
                                    {sizeError && sizeError.size && (
                                      <p className="mt-1 text-xs text-red-600">{sizeError.size}</p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <input
                                      type="number"
                                      value={sizeItem.stock}
                                      onChange={(e) => handleSizeChange(index, 'stock', e.target.value)}
                                      className={`block w-20 border ${sizeError && sizeError.stock ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                      placeholder="0"
                                      min="0"
                                    />
                                    {sizeError && sizeError.stock && (
                                      <p className="mt-1 text-xs text-red-600">{sizeError.stock}</p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSize(index)}
                                      className="text-xs text-red-600 hover:text-red-800"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSize}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Size
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            onClick={isEditing ? handleUpdateProduct : handleAddProduct}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            {isEditing ? 'Update Product' : 'Add Product'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setIsEditing(false);
              setCurrentProductId(null);
            }}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium mb-4">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category name"
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={editingCategory ? handleEditCategory : handleAddCategory}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setCategoryFormData({ name: '' });
                    setEditingCategory(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};

export default ProductManagement;