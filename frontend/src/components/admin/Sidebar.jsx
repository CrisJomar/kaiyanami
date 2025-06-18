// Add this to your admin sidebar navigation
<li>
  <Link
    to="/admin/reports"
    className={`flex items-center px-4 py-2 rounded-lg ${
      location.pathname === '/admin/reports' 
        ? 'bg-gray-800 text-white' 
        : 'text-gray-300 hover:bg-gray-700'
    }`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1h-12a1 1 0 01-1-1V3zm2 0v12h12V3H5z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M4 8h12v2H4V8zm0 4h12v2H4v-2zm0-8h12v2H4V4z" clipRule="evenodd" />
    </svg>
    <span>Reports</span>
  </Link>
</li>