import React from "react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="relative h-[80vh] w-full overflow-hidden bg-gray-100 mt-16">
      <img 
        src="src/assets/Hero.png" 
        alt="Fashion collection" 
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      {/* Hero content */}
      <div className="absolute inset-0 flex items-center justify-start px-8 md:px-16">
        <div className="max-w-md text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Summer Collection</h1>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 md:w-11 h-[2px] bg-white"></div>
            <p className="font-medium text-sm md:text-base tracking-wider">NEW DROP </p>
          </div>
          <Link 
            to="/collection" 
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 font-medium hover:bg-opacity-90 transition-all"
          >
            <span>SHOP NOW</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Hero;
