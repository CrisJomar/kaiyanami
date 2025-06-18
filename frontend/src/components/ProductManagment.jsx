import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    imageUrl: '',
    hasSizes: false,
    sizes: []
  });

const [categories, setCategories] = useState([]);
const [showCategoryModal, setShowCategoryModal] = useState(false);
const [editingCategory, setEditingCategory] = useState(null);
const [categoryFormData, setCategoryFormData] = useState({ name: '' });

// Replace the persistCategories function
const persistCategories = (categoriesToSave) => {
  try {
    if (!Array.isArray(categoriesToSave)) {
      console.error("Cannot persist categories - not an array:", categoriesToSave);
      return;
    }
    
    if (categoriesToSave.length === 0) {
      console.warn("Persisting empty categories array");
    }
    
    const categoriesJson = JSON.stringify(categoriesToSave);
    localStorage.setItem('productCategories', categoriesJson);
    console.log('Categories saved to localStorage:', categoriesToSave);
    
    // Verify it was saved correctly
    const savedValue = localStorage.getItem('productCategories');
    if (!savedValue) {
      console.error("Failed to save categories to localStorage - value not found after save");
    } else if (savedValue !== categoriesJson) {
      console.error("Categories saved incorrectly to localStorage");
      console.log("Original:", categoriesJson);
      console.log("Saved:", savedValue);
    }
  } catch (err) {
    console.error('Error saving categories to localStorage:', err);
  }
};

  // Fetch products on component mount
  useEffect(() => {
    console.log("ProductManagement initializing...");
    
 
    const loadData = async () => {
      try {
        setLoading(true);
        
     
        const savedCategories = localStorage.getItem('productCategories');
        if (savedCategories) {
          try {
            const parsedCategories = JSON.parse(savedCategories);
            if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
              console.log('Initial load - Using categories from localStorage:', parsedCategories);
              setCategories(parsedCategories);
        
              await fetchProducts();
             
              fetchCategories().catch(err => {
                console.error("Error fetching categories from API:", err);
              
              });
              return;
            }
          } catch (e) {
            console.error('Error parsing saved categories:', e);
          }
        }

        console.log("No valid categories in localStorage, loading from API...");
        await Promise.all([fetchProducts(), fetchCategories()]);
        
      } catch (error) {
        console.error("Error during initial data load:", error);
        setError("Failed to load data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/categories');
      
      if (Array.isArray(response.data)) {
        
        const formattedCategories = response.data.map(cat => {
         
          if (typeof cat === 'object' && cat.name) {
            return cat;
          }
         
          if (typeof cat === 'string') {
            return { name: cat, id: `cat-${cat}` };
          }
          return cat;
        });
        
        if (!formattedCategories.some(cat => 
          (cat.name === 'Uncategorized' || cat === 'Uncategorized')
        )) {
          formattedCategories.push({ name: 'Uncategorized', id: 'cat-uncategorized' });
        }
        
        console.log("Categories fetched and formatted:", formattedCategories);
        setCategories(formattedCategories);
        
        
        persistCategories(formattedCategories);
      } else {
        console.error('Unexpected response format:', response.data);
        
      
        loadCategoriesFromLocalStorage();
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      
  
      loadCategoriesFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

 
  const loadCategoriesFromLocalStorage = () => {
    const savedCategories = localStorage.getItem('productCategories');
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories);
        if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
          console.log('Loading categories from localStorage:', parsedCategories);
          setCategories(parsedCategories);
          return true;
        }
      } catch (e) {
        console.error('Error parsing saved categories:', e);
      }
    }
    
  
    const fallbackCategories = [{ name: 'Uncategorized', id: 'cat-uncategorized' }];
    setCategories(fallbackCategories);
    persistCategories(fallbackCategories);
    return false;
  };

 
  const getProductCountByCategory = (categoryName) => {
  
    const categoryObj = categories.find(cat => cat.name === categoryName);
    if (categoryObj && typeof categoryObj.count === 'number') {
      return categoryObj.count;
    }
    // Fallback to counting products manually
    return products.filter(product => 
      (product.category || 'Uncategorized') === categoryName
    ).length;
  };

  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/products/admin');
      
   
      const productsWithSizes = await Promise.all(
        response.data.products.map(async (product) => {
          if (product.hasSizes) {
            // Get full product details including sizes
            const detailsResponse = await axios.get(`http://localhost:5001/api/products/${product.id}`);
            return detailsResponse.data;
          }
          return product;
        })
      );
      
      setProducts(productsWithSizes);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setCurrentProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '0',
      category: '',
      imageUrl: '',
      hasSizes: false,
      sizes: []
    });
    setAvailableSizes([]);
    setSelectedSize(null);
    setShowModal(true);
  };

  const openEditModal = async (product) => {
    try {
     
      const response = await axios.get(`http://localhost:5001/api/products/${product.id}`);
      const fullProduct = response.data;
      
      console.log("Full product with sizes:", fullProduct);
      
      setCurrentProduct(fullProduct);
      
      const sizes = fullProduct.productSizes?.map(ps => ({
        size: ps.size, 
        stock: ps.stock
      })) || [];
      
      setFormData({
        name: fullProduct.name || '',
        description: fullProduct.description || '',
        price: fullProduct.price.toString() || '',
        stock: fullProduct.stock.toString() || '',
        category: fullProduct.category || '',
        imageUrl: fullProduct.imageUrl && fullProduct.imageUrl.length > 0 ? 
                  fullProduct.imageUrl[0] : '',
        hasSizes: !!fullProduct.hasSizes,
        sizes: sizes
      });
      
      setAvailableSizes(fullProduct.productSizes || []);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching product details:", error);
      toast.error("Failed to load product details");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        return;
      }
      
  
      if (formData.hasSizes && (!formData.sizes || formData.sizes.length === 0)) {
        toast.error('Please add at least one size option');
        return;
      }
      

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: formData.hasSizes ? 0 : parseInt(formData.stock, 10),
        sizes: formData.hasSizes ? formData.sizes.map(item => ({
          size: item.size,
          stock: parseInt(String(item.stock), 10) || 0
        })) : []
      };
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (currentProduct) {
        // Update existing product
        await axios.put(
          `http://localhost:5001/api/products/${currentProduct.id}`, 
          productData,
          config
        );
        toast.success('Product updated successfully');
      } else {
        // Create new product
        await axios.post(
          'http://localhost:5001/api/products', 
          productData,
          config
        );
        toast.success('Product created successfully');
      }
      
      setShowModal(false);
      fetchProducts(); // Refresh product list
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error(err.response?.data?.message || 'Error saving product');
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          toast.error('Authentication token not found. Please login again.');
          return;
        }
        
        await axios.delete(`http://localhost:5001/api/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        toast.success('Product deleted successfully');
        fetchProducts(); // Refresh product list
      } catch (err) {
        console.error('Error deleting product:', err);
        toast.error(err.response?.data?.message || 'Error deleting product');
      }
    }
  };

  // In your product detail component
  const [selectedSize, setSelectedSize] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);

  // Add this debugging function
  useEffect(() => {
    // Debug on mount - check localStorage
    console.log("LocalStorage check:", localStorage.getItem('productCategories'));
  }, []);
  
  // handleAddCategory function
  const handleAddCategory = async () => {
    try {
      if (!categoryFormData.name.trim()) {
        toast.error('Category name is required');
        return;
      }
      
      // Check if category already exists
      if (categories.some(cat => cat.name?.toLowerCase() === categoryFormData.name.trim().toLowerCase())) {
        toast.error('Category with this name already exists');
        return;
      }
      
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'http://localhost:5001/api/categories', 
        { name: categoryFormData.name.trim() },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log("Add category response:", response.data);
      
      // Create a properly formatted category object
      const newCategory = {
        name: response.data.name || categoryFormData.name.trim(),
        id: response.data.id || `cat-${Date.now()}`,
        count: 0
      };
      
      // Add the new category to the list
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      persistCategories(updatedCategories); // Add this line
      toast.success('Category added successfully');
      setShowCategoryModal(false);
      setCategoryFormData({ name: '' });
    } catch (err) {
      console.error('Error adding category:', err);
      toast.error(err.response?.data?.message || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  //  handleUpdateCategory
  const handleUpdateCategory = async () => {
    try {
      if (!categoryFormData.name.trim() || !editingCategory) {
        toast.error('Category name is required');
        return;
      }
      
      // Check if new name already exists (but it's not the current category)
      const newNameLower = categoryFormData.name.trim().toLowerCase();
      if (categories.some(cat => 
        cat.name?.toLowerCase() === newNameLower && 
        cat.name !== editingCategory
      )) {
        toast.error('Category with this name already exists');
        return;
      }
      
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log("Updating category from", editingCategory, "to", categoryFormData.name.trim());
      
      const response = await axios.put(
        `http://localhost:5001/api/categories/${editingCategory}`, 
        { name: categoryFormData.name.trim() },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log("Update category response:", response.data);
      
      // Create a properly formatted category object
      const updatedCategory = {
        name: response.data.name || categoryFormData.name.trim(),
        id: response.data.id || `cat-${Date.now()}`,
        count: response.data.count || getProductCountByCategory(editingCategory)
      };
      
      // Update the categories state
      const updatedCategories = categories.map(cat => 
        cat.name === editingCategory ? updatedCategory : cat
      );
      setCategories(updatedCategories);
      persistCategories(updatedCategories); // Add this line
      
      // Update any products with this category
      setProducts(prevProducts => 
        prevProducts.map(product => {
          if (product.category === editingCategory) {
            return { ...product, category: updatedCategory.name };
          }
          return product;
        })
      );
      
      toast.success('Category updated successfully');
      setShowCategoryModal(false);
      setCategoryFormData({ name: '' });
      setEditingCategory(null);
    } catch (err) {
      console.error('Error updating category:', err);
      toast.error(err.response?.data?.message || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  // Modified handleDeleteCategory
  const handleDeleteCategory = async (categoryName) => {
    if (!categoryName) {
      toast.error('Invalid category');
      return;
    }
    
    // Special protection for Uncategorized category
    if (categoryName === 'Uncategorized') {
      toast.error('The Uncategorized category cannot be deleted');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete the category "${categoryName}"? Products will be moved to "Uncategorized".`)) {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        console.log("Deleting category:", categoryName);
        
        await axios.delete(
          `http://localhost:5001/api/categories/${categoryName}`, 
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        // Remove the category from our state
        const updatedCategories = categories.filter(cat => cat.name !== categoryName);
        setCategories(updatedCategories);
        persistCategories(updatedCategories); 
        
        // Update any products with this category to Uncategorized
        setProducts(prevProducts => 
          prevProducts.map(product => {
            if (product.category === categoryName) {
              return { ...product, category: 'Uncategorized' };
            }
            return product;
          })
        );
        
        toast.success('Category deleted successfully');
      } catch (err) {
        console.error('Error deleting category:', err);
        toast.error(err.response?.data?.message || 'Failed to delete category');
      } finally {
        setLoading(false);
      }
    }
  };

  // Improved renderCategoriesSection with better styling and product counts
  const renderCategoriesSection = () => {
    return (
      <div className="mt-8 bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-700">Categories</h3>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryFormData({ name: '' });
              setShowCategoryModal(true);
            }}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Add Category
          </button>
        </div>
        
        <div className="p-6">
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No categories found.</p>
              <button 
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryFormData({ name: '' });
                  setShowCategoryModal(true);
                }}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              >
                Add Your First Category
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div 
                  key={category.id || `category-${category.name}`} 
                  className="p-4 border rounded-md shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-medium text-gray-800">{category.name}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category.name);
                          setCategoryFormData({ name: category.name });
                          setShowCategoryModal(true);
                        }}
                        className={`text-indigo-600 hover:text-indigo-900 text-sm flex items-center ${
                          category.name === 'Uncategorized' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={category.name === 'Uncategorized'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.name)}
                        className={`text-red-600 hover:text-red-900 text-sm flex items-center ${
                          category.name === 'Uncategorized' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={category.name === 'Uncategorized'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {category.count !== undefined ? category.count : getProductCountByCategory(category.name)} products
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCategoryModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (editingCategory) {
            handleUpdateCategory();
          } else {
            handleAddCategory();
          }
        }}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name*
            </label>
            <input
              type="text"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowCategoryModal(false);
                setEditingCategory(null);
                setCategoryFormData({ name: '' });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingCategory ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const handleImageUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
  
      const response = await axios.post('http://localhost:5001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Upload response:", response.data);
      
      if (response.data && response.data.url) {
        return response.data.url;
      } else {
        console.error("Invalid response format:", response.data);
        throw new Error("Invalid image upload response");
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error("Failed to upload image");
      throw error;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Product Management</h2>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add New Product
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr key="header-row"> {/* FIXED: Added key */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* If no products, show empty message */}
                {products.length === 0 ? (
                  <tr key="empty-products-row"> {/* FIXED: Added key */}
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No products found. Click "Add New Product" to create one.
                    </td>
                  </tr>
                ) : (
                  // Group products by category
                  Object.entries(
                    // First, group products by category
                    products.reduce((groups, product) => {
                      const category = product.category || 'Uncategorized';
                      if (!groups[category]) {
                        groups[category] = [];
                      }
                      groups[category].push(product);
                      return groups;
                    }, {})
                  ).map(([category, categoryProducts], categoryIndex) => (
                    // Use React.Fragment with key for the category group
                    <React.Fragment key={`category-group-${categoryIndex}`}>
                      {/* Category header row */}
                      <tr key={`category-header-${categoryIndex}`} className="bg-gray-50">
                        <td colSpan="6" className="px-6 py-2 text-xs text-gray-700 font-medium">
                          Category: {category}
                        </td>
                      </tr>
                      
                      {/* Products in this category */}
                      {categoryProducts.map((product) => (
                        <tr key={`product-${product.id}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name} 
                                  className="h-full w-full object-cover"
                                  onError={(e) => {e.target.src = 'https://via.placeholder.com/150'}}
                                />
                              ) : (
                                <span className="text-gray-400 text-xs">No image</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {product.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${parseFloat(product.price).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.hasSizes && product.productSizes?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {product.productSizes.map((sizeItem) => (
                                  <span key={`size-${product.id}-${sizeItem.size}`} className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {sizeItem.size}: {sizeItem.stock}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                                {product.stock}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditModal(product)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {currentProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name*
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price*
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock*
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  list="categories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <datalist id="categories">
                  {categories.map((cat, index) => (
                    <option key={index} value={cat.name || cat} />
                  ))}
                </datalist>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.imageUrl && (
                  <div className="mt-2 h-32 border rounded overflow-hidden">
                    <img 
                      src={formData.imageUrl} 
                      alt="Product preview" 
                      className="h-full w-auto object-contain"
                      onError={(e) => {e.target.src = 'https://via.placeholder.com/150?text=Invalid+Image'}}
                    />
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasSizes"
                    name="hasSizes"
                    checked={formData.hasSizes}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        hasSizes: e.target.checked,
                        // If unchecking, clear sizes
                        sizes: e.target.checked ? formData.sizes : []
                      });
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hasSizes" className="ml-2 block text-sm text-gray-900">
                    This product has multiple sizes
                  </label>
                </div>
              </div>

              {formData.hasSizes && (
                <div className="mb-4 border p-4 rounded-md">
                  <div className="flex justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Size Options</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          sizes: [...formData.sizes, { size: '', stock: 0 }]
                        });
                      }}
                      className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded"
                    >
                      + Add Size
                    </button>
                  </div>
                  
                  {formData.sizes.length === 0 && (
                    <div className="text-sm text-gray-500 italic">
                      No sizes added. Click "Add Size" to add size options.
                    </div>
                  )}
                  
                  {formData.sizes.map((sizeItem, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Size (S, M, L...)"
                        value={sizeItem.size}
                        onChange={(e) => {
                          const updatedSizes = [...formData.sizes];
                          updatedSizes[index].size = e.target.value;
                          setFormData({ ...formData, sizes: updatedSizes });
                        }}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Stock"
                        value={sizeItem.stock}
                        onChange={(e) => {
                          const updatedSizes = [...formData.sizes];
                          updatedSizes[index].stock = parseInt(e.target.value, 10);
                          setFormData({ ...formData, sizes: updatedSizes });
                        }}
                        className="w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedSizes = formData.sizes.filter((_, i) => i !== index);
                          setFormData({ ...formData, sizes: updatedSizes });
                        }}
                        className="text-red-500 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {currentProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Sizes */}
      {currentProduct && (
        <div className="mt-4">
          {currentProduct.hasSizes && availableSizes.length > 0 ? (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Size</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableSizes.map((sizeItem) => (
                  <button
                    key={sizeItem.size}
                    type="button"
                    onClick={() => setSelectedSize(sizeItem.size)}
                    className={`px-3 py-1 border ${
                      selectedSize === sizeItem.size
                        ? 'border-blue-600 bg-blue-100 text-blue-800'
                        : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                    } rounded-md text-sm font-medium ${
                      sizeItem.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={sizeItem.stock === 0}
                  >
                    {sizeItem.size} {sizeItem.stock === 0 && " (Out of stock)"}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Non-sized product - just show stock
            <div className="mt-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentProduct.stock === 0
                  ? 'bg-red-100 text-red-800'
                  : currentProduct.stock < 10
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {currentProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
          )}
        </div>
      )}

      {renderCategoriesSection()}

      {showCategoryModal && renderCategoryModal()}
    </div>
  );
};

export default ProductManagement;
