import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useShopContext } from "../context/ShopContext";
import { toast } from "react-toastify";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, currency } = useShopContext();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/products/${id}`);
        
        // Detailed debugging of API response
        console.log('=== API RESPONSE DEBUG ===');
        console.log('Full product data:', response.data);
        console.log('hasSizes property:', response.data.hasSizes);
        console.log('sizes property:', response.data.sizes);
        console.log('sizes is Array?', Array.isArray(response.data.sizes));
        console.log('sizes length:', response.data.sizes?.length);
        
        console.log('productSizes property:', response.data.productSizes);
        
        setProduct(response.data);
      
        if (response.data.hasSizes && response.data.sizes && response.data.sizes.length > 0) {
          console.log('Product has sizes, trying to select first available');
          const availableSizes = response.data.sizes.filter(size => parseInt(size.stock) > 0);
          console.log('Available sizes:', availableSizes);
          
          if (availableSizes.length > 0) {
            console.log('Setting selected size to:', availableSizes[0].size);
            setSelectedSize(availableSizes[0].size);
          } else {
            console.log('No sizes with stock available');
          }
        } else {
          console.log('Product does not have sizes or sizes array is empty/undefined');
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setError("Failed to load product. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const incrementQuantity = () => {
    if (quantity < getSelectedSizeStock()) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= getSelectedSizeStock()) {
      setQuantity(value);
    }
  };

  // Get stock for selected size
  const getSelectedSizeStock = () => {
    if (!product) return 0;
    if (!product.hasSizes || !selectedSize) return product.stock || 0;
    
    const sizeObj = product.sizes?.find(s => s.size === selectedSize);
    return sizeObj ? parseInt(sizeObj.stock) : 0;
  };

  // Check if product is out of stock
  const isOutOfStock = () => {
    if (!product) return true;
    
    if (product.hasSizes && product.sizes && product.sizes.length > 0) {
      return !product.sizes.some(size => parseInt(size.stock) > 0);
    }
    return product.stock === 0;
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (isOutOfStock()) {
      toast.error("This product is out of stock.");
      return;
    }
    
    if (product.hasSizes && !selectedSize) {
      toast.warning("Please select a size first.");
      return;
    }
    
    const cartItem = {
      ...product,
      quantity,
      selectedSize: product.hasSizes ? selectedSize : null
    };
    
    addToCart(cartItem);
    toast.success(`${product.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md">
          Product not found.
        </div>
      </div>
    );
  }

  const outOfStock = isOutOfStock();
  const selectedSizeStock = getSelectedSizeStock();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Product Image */}
        <div className="md:w-1/2">
          <div className="relative aspect-square overflow-hidden rounded-lg mb-4">
            <img
              src={Array.isArray(product.imageUrl) ? product.imageUrl[activeImage] : product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "/placeholder-image.jpg";
              }}
            />
          </div>
          
          {/* Thumbnail images */}
          {Array.isArray(product.imageUrl) && product.imageUrl.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {product.imageUrl.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={`
                    w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border-2
                    ${activeImage === index ? 'border-black' : 'border-transparent'}
                  `}
                >
                  <img
                    src={img}
                    alt={`${product.name} - ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "/placeholder-image.jpg";
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="md:w-1/2">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>
          
          <div className="bg-red-100 p-4 mb-4 rounded">
            <h3 className="text-red-800 font-bold">Debug Info:</h3>
            <p>hasSizes: {String(product.hasSizes)}</p>
            <p>sizes array exists: {String(!!product.sizes)}</p>
            <p>sizes length: {product.sizes ? product.sizes.length : 'N/A'}</p>
            
            {product.sizes && (
              <div>
                <p className="font-bold mt-2">Sizes data:</p>
                <pre className="bg-white p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(product.sizes, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          {/* Price */}
          <div className="mb-4">
            <span className="text-xl font-bold text-gray-900">
              {currency}{parseFloat(product.price).toFixed(2)}
            </span>
          </div>
          
          {/* SIMPLE DROPDOWN FOR SIZES */}
          <div className="mb-6 border-2 border-blue-500 bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-blue-800 mb-3">Select Size:</h3>
            
            {product.hasSizes && product.sizes && product.sizes.length > 0 ? (
              <select
                value={selectedSize || ''}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="block w-full py-3 px-4 text-lg font-bold bg-white border-2 border-blue-500 rounded-lg focus:border-blue-700 focus:ring focus:ring-blue-300"
              >
                <option value="" disabled>-- Select a Size --</option>
                {product.sizes.map((sizeItem, index) => {
                  const sizeValue = sizeItem.size;
                  const sizeStock = parseInt(sizeItem.stock);
                  const inStock = sizeStock > 0;
                  
                  return (
                    <option 
                      key={index} 
                      value={sizeValue} 
                      disabled={!inStock}
                    >
                      {sizeValue} {inStock ? `(${sizeStock} available)` : "(Out of Stock)"}
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="bg-red-100 p-3 rounded-md text-red-800">
                No sizes available for this product
              </p>
            )}
            
            {selectedSize && (
              <div className="mt-3 bg-green-100 p-2 rounded text-green-800 font-bold">
                You selected: {selectedSize}
              </div>
            )}
          </div>
          
          {/* Quantity selector */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Quantity</h3>
            <div className="flex border border-gray-300 rounded-md w-32">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={selectedSizeStock}
                value={quantity}
                onChange={handleQuantityChange}
                className="w-full text-center border-x border-gray-300 py-1 focus:outline-none"
              />
              <button
                onClick={incrementQuantity}
                disabled={quantity >= selectedSizeStock}
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
          
          {/* Add to Cart Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                outOfStock || 
                (product.hasSizes && !selectedSize)
              }
              className={`
                w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-md
                text-base font-medium text-white
                ${outOfStock || (product.hasSizes && !selectedSize)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-black hover:bg-gray-800'
                }
              `}
            >
              {outOfStock 
                ? 'Out of Stock' 
                : product.hasSizes && !selectedSize
                  ? 'Select a Size'
                  : 'Add to Cart'
              }
            </button>
          </div>
          
          {/* Description */}
          <div className="mt-8 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <div className="prose prose-sm text-gray-600">
              {product.description ? (
                <p>{product.description}</p>
              ) : (
                <p>No description available for this product.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;