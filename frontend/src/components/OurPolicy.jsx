import React from "react";
import { assets } from "../assets/all_products";

const OurPolicy = () => {
  return (
    <section className="py-20 bg-gray-50 text-gray-700">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-center text-2xl font-bold mb-10">Why Choose Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {/* Easy Exchange Policy */}
          <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <img
              className="w-16 mb-4"
              src={assets.exchange_icon}
              alt="Easy Exchange Policy"
            />
            <h3 className="text-lg font-semibold mb-2">Easy Exchange Policy</h3>
            <p className="text-sm text-gray-500">
              Enjoy a hassle-free exchange process to meet your satisfaction.
            </p>
          </div>

          {/* 7 Days Return Policy */}
          <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <img
              className="w-16 mb-4"
              src={assets.quality_icon}
              alt="7 Days Return Policy"
            />
            <h3 className="text-lg font-semibold mb-2">7 Days Return Policy</h3>
            <p className="text-sm text-gray-500">
              Shop confidently with our flexible 7-day return policy.
            </p>
          </div>

          {/* Free Shipping */}
          <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <img
              className="w-16 mb-4"
              src={assets.delivery_icon || assets.exchange_icon} // Fallback if delivery icon not available
              alt="Free Shipping"
            />
            <h3 className="text-lg font-semibold mb-2">Free Shipping</h3>
            <p className="text-sm text-gray-500">
              Enjoy free shipping on all orders over $50.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurPolicy;
