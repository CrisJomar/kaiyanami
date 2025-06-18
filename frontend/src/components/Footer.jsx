import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaEnvelope } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">Kaiyanami</h3>
            <p className="mb-4">Providing quality products since 2023.</p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-blue-400" aria-label="Facebook">
                <FaFacebook size={20} />
              </a>
              <a href="#" className="hover:text-blue-400" aria-label="Twitter">
                <FaTwitter size={20} />
              </a>
              <a href="#" className="hover:text-blue-400" aria-label="Instagram">
                <FaInstagram size={20} />
              </a>
              <a href="mailto:info@kaiyanami.com" className="hover:text-blue-400" aria-label="Email">
                <FaEnvelope size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/collection" className="hover:text-blue-400">Shop Collection</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-400">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-400">Contact</Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-blue-400">FAQ</Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-xl font-bold mb-4">Contact Us</h3>
            <address className="not-italic">
              <p className="mb-2">Mayguez, Puerto Rico</p>
              <p className="mb-2">Mayaguez, Puerto Rico 00680</p>
              <p className="mb-2">Phone: (123) 456-7890</p>
              <p>Email: info@kaiyanami.com</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center">
          <p>&copy; {currentYear} Kaiyanami. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
