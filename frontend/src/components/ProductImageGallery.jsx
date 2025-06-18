import React, { useState } from 'react';

const ProductImageGallery = ({ images = [] }) => {
  const [mainImage, setMainImage] = useState(images[0] || '');
  
  return (
    <div>
      {/* Main Image */}
      <div className="mb-4 aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-100">
        <img
          src={mainImage}
          alt="Product image"
          className="h-full w-full object-cover object-center"
        />
      </div>
      
      {/* Thumbnails */}
      {imageList.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {imageList.map((image, index) => (
            <button
              key={index}
              onClick={() => setMainImage(image)}
              className={`relative h-16 overflow-hidden rounded-md ${
                mainImage === image 
                  ? 'ring-2 ring-indigo-500' 
                  : 'hover:opacity-75'
              }`}
            >
              <img
                src={image}
                alt={`Product thumbnail ${index + 1}`}
                className="h-full w-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;