import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <p className="text-xl mt-4 mb-8">Page not found</p>
        <Link to="/" className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;