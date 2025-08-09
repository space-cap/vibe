import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-gray-800">
            React App
          </Link>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link 
                  to="/" 
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/about" 
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link 
                  to="/profile" 
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Profile
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;