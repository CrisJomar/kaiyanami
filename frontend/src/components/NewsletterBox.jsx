import React from "react";

const NewsletterBox = () => {
  return (
    <div className="text-center">
      <p className="text-2xl font-medium text-white">
        Subscribe now & get 10% off
      </p>
      <p className="text-white text-opacity-80 mt-3">
        Join our newsletter to receive updates on new collections, special offers, and exclusive content.
      </p>

      <form className="w-full sm:w-2/3 lg:w-1/2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mx-auto my-6">
        <input
          className="w-full flex-1 outline-none px-4 py-3 rounded-md"
          type="email"
          placeholder="Enter your email address"
          required
        />
        <button
          className="bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 transition-colors font-medium tracking-wide"
          type="submit"
        >
          SUBSCRIBE
        </button>
      </form>
      <p className="text-xs text-white text-opacity-70 mt-3">
        By subscribing, you agree to our Privacy Policy. You can unsubscribe at any time.
      </p>
    </div>
  );
};

export default NewsletterBox;
