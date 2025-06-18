import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useShopContext } from "../context/ShopContext";
import { toast } from "react-toastify";
import WishlistButton from '../components/WishlistButton';
import ProductReviews from '../components/ProductReviews';

const Product = () => {
  const { id } = useParams();
  const { addToCart, currency } = useShopContext();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [productWithSizes, setProductWithSizes] = useState(null);


  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
    
        const response = await fetch(`http://localhost:5001/api/products/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Try to parse as JSON
        const rawText = await response.text();
        let productData;
        try {
          productData = JSON.parse(rawText);
          console.log("Product data loaded:", productData); 
        } catch (e) {
          console.error('Failed to parse JSON:', e);
          throw new Error('Invalid JSON from server');
        }
        
       
        if (productData.hasSizes && productData.productSizes && productData.productSizes.length > 0) {
          productData.sizes = productData.productSizes.map(ps => ({
            size: ps.size,
            stock: ps.stock
          }));
        }
        
        setProduct(productData);
        
        if (productData.sizes && productData.sizes.length > 0) {
          const availableSizes = productData.sizes.filter(size => parseInt(size.stock) > 0);
          if (availableSizes.length > 0) {
            setSelectedSize(availableSizes[0].size);
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (product && product.hasSizes && !product.productSizes) {
        try {
          const response = await axios.get(`http://localhost:5001/api/products/${product.id}`);
          setProductWithSizes(response.data);
        } catch (error) {
          console.error("Error fetching product details:", error);
        }
      } else {
        setProductWithSizes(product);
      }
    };
    
    fetchProductDetails();
  }, [product]);

  const getSelectedSizeStock = () => {
    if (!product) return 0;
    if (!product.hasSizes || !selectedSize) return product.stock || 0;
    
    const sizeObj = product.sizes?.find(s => s.size === selectedSize);
    return sizeObj ? parseInt(sizeObj.stock) : 0;
  };


  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    if (product.hasSizes && !selectedSize) {
      toast.warning("Please select a size first");
      return;
    }
    
    const cartItem = {
      ...product,
      quantity,
      selectedSize: product.hasSizes ? selectedSize : null
    };
    
    addToCart(cartItem);
    toast.success(`${product.name || 'Product'} added to cart!`);
  };

  if (loading) {
    return <div className="container mx-auto px-4 text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto px-4 text-center py-10 text-red-500">{error}</div>;
  }

  if (!product) {
    return <div className="container mx-auto px-4 text-center py-10">Product not found</div>;
  }

  const displayProduct = productWithSizes || product;
  const productName = displayProduct?.name || "Product";
  const productPrice = displayProduct?.price || 0;

  return (
    <div className="container mx-auto px-4 py-8 mt-16 pt-4"> 
      <div className="flex flex-col md:flex-row gap-8">
        {/* Product Image */}
        <div className="md:w-1/2 max-w-full">
          <img
            src={Array.isArray(displayProduct.imageUrl) && displayProduct.imageUrl.length > 0 
              ? displayProduct.imageUrl[activeImage] 
              : (displayProduct.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image')}
            alt={productName}
            className="w-full h-auto rounded-lg object-contain max-h-[500px]"
          />
          
          {/* Image selector if multiple images */}
          {Array.isArray(displayProduct.imageUrl) && displayProduct.imageUrl.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {displayProduct.imageUrl.map((img, index) => (
                <button 
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={`
                    h-16 w-16 rounded border-2 
                    ${activeImage === index ? 'border-black' : 'border-gray-200'}
                  `}
                >
                  <img 
                    src={img} 
                    alt={`${productName} - View ${index + 1}`} 
                    className="w-full h-full object-cover rounded"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Product Details */}
        <div className="md:w-1/2 flex flex-col">
          <h1 className="text-3xl font-bold text-gray-800">{productName}</h1>
          <p className="text-2xl font-bold mt-2 text-gray-900">{currency}{parseFloat(productPrice).toFixed(2)}</p>
          
          {/* Size Selection */}
          {displayProduct?.hasSizes && (
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Select Size</h3>
              
              {/* Try to use either productSizes or sizes */}
              {((displayProduct.productSizes && displayProduct.productSizes.length > 0) || 
                (displayProduct.sizes && displayProduct.sizes.length > 0)) ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {/* Try productSizes first, fall back to sizes */}
                    {(displayProduct.productSizes || displayProduct.sizes).map((sizeItem, index) => {
                      // Ensure we have proper size and stock values
                      const sizeValue = sizeItem.size || '';
                      const stockValue = parseInt(sizeItem.stock || 0);
                      const inStock = stockValue > 0;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => inStock && handleSizeSelect(sizeValue)}
                          disabled={!inStock}
                          className={`
                            py-2 px-4 rounded 
                            ${selectedSize === sizeValue 
                              ? 'bg-black text-white' 
                              : inStock 
                                ? 'bg-gray-200 hover:bg-gray-300' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          {sizeValue}
                          <span className="block text-xs mt-1">
                            {inStock ? `${stockValue} left` : 'Out of stock'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {selectedSize && (
                    <p className="mt-2 text-sm">
                      Selected: <span className="font-medium">{selectedSize}</span>
                    </p>
                  )}
                </>
              ) : (
                <div className="bg-orange-100 p-2 rounded">
                  <p className="text-orange-700">
                    This product should have sizes, but none were found.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Quantity */}
          <div className="mt-6">
            <h3 className="text-md font-medium mb-2">Quantity</h3>
            <div className="flex items-center border rounded w-32">
              <button 
                className="px-3 py-1"
                onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                disabled={quantity <= 1}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= getSelectedSizeStock()) {
                    setQuantity(val);
                  }
                }}
                className="w-full text-center py-1 border-x"
              />
              <button 
                className="px-3 py-1"
                onClick={() => quantity < getSelectedSizeStock() && setQuantity(quantity + 1)}
                disabled={quantity >= getSelectedSizeStock()}
              >
                +
              </button>
            </div>
            
            <p className="mt-1 text-sm">
              {!displayProduct.hasSizes || selectedSize ? 
                `${getSelectedSizeStock()} available${displayProduct.hasSizes ? ` in size ${selectedSize}` : ''}` : 
                'Please select a size to see availability'
              }
            </p>
          </div>
          
          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!product || (product.hasSizes && !selectedSize) || getSelectedSizeStock() <= 0}
            className={`
              mt-6 w-full py-3 px-4 rounded font-medium
              ${!product || (product.hasSizes && !selectedSize) || getSelectedSizeStock() <= 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
              }
            `}
          >
            {!product 
              ? 'Loading...' 
              : getSelectedSizeStock() <= 0
                ? 'Out of Stock'
                : product.hasSizes && !selectedSize
                  ? 'Select a Size'
                  : 'Add to Cart'
            }
          </button>
          
          <div className="flex items-center mt-2">
            <WishlistButton productId={product.id} size="lg" />
            <span className="ml-2 text-gray-600">Add to Wishlist</span>
          </div>

          {/* Description */}
          <div className="mt-8 pt-4 border-t">
            <h3 className="text-lg font-medium mb-2">Description</h3>
            <p className="text-gray-600">{displayProduct.description || 'No description available'}</p>
          </div>
        </div>
      </div>

      {/* Product Reviews */}
      <div className="mt-12">
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
};

export default Product;