import clsx from "clsx";
import { ChevronDown, Film, LogOut, Menu, Search, Tv, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Navbar: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Close menus when location changes
    setIsMenuOpen(false);
    setIsSearchOpen(false);
    setShowUserMenu(false);
  }, [location]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getUserInitial = () => {
    return user?.Name ? user.Name.charAt(0).toUpperCase() : "U";
  };

  return (
    <header
      className={clsx(
        "absolute top-0 left-0 right-0 z-20 transition-all duration-300",
        "bg-gradient-to-b from-black/80 to-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-red-600 font-bold text-2xl">JELLYFIN</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={clsx(
                "text-sm font-medium hover:text-white transition-colors",
                location.pathname === "/" ? "text-white" : "text-gray-300"
              )}
            >
              Home
            </Link>
            <Link
              to="/movies"
              className={clsx(
                "text-sm font-medium hover:text-white transition-colors",
                location.pathname === "/movies" ? "text-white" : "text-gray-300"
              )}
            >
              Movies
            </Link>
            <Link
              to="/shows"
              className={clsx(
                "text-sm font-medium hover:text-white transition-colors",
                location.pathname === "/shows" ? "text-white" : "text-gray-300"
              )}
            >
              TV Shows
            </Link>
            <Link
              to="/favourites"
              className={clsx(
                "text-sm font-medium hover:text-white transition-colors",
                location.pathname === "/shows" ? "text-white" : "text-gray-300"
              )}
            >
              Favourites
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              {/* Search Input */}
              {isSearchOpen && (
                <div className="absolute right-0 top-12 w-64 bg-gray-900 rounded-md shadow-lg overflow-hidden">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="flex items-center p-2"
                  >
                    <input
                      type="text"
                      placeholder="Titles, people, genres"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-l-md focus:outline-none focus:ring-1 focus:ring-red-600"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-red-600 text-white px-3 py-2 rounded-r-md"
                    >
                      <Search size={16} />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* User Profile */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-medium">
                    {getUserInitial()}
                  </div>
                  <ChevronDown size={16} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-gray-900 rounded-md shadow-lg overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-800">
                      <p className="text-white font-medium">{user?.Name}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full p-3 text-left text-gray-300 hover:bg-gray-800 transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-sm">
          <nav className="container mx-auto px-4 py-3 flex flex-col space-y-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-300 hover:text-white p-2"
            >
              Home
            </Link>
            <Link
              to="/movies"
              className="flex items-center gap-2 text-gray-300 hover:text-white p-2"
            >
              <Film size={18} />
              <span>Movies</span>
            </Link>
            <Link
              to="/tv"
              className="flex items-center gap-2 text-gray-300 hover:text-white p-2"
            >
              <Tv size={18} />
              <span>TV Shows</span>
            </Link>
            <Link
              to="/latest"
              className="flex items-center gap-2 text-gray-300 hover:text-white p-2"
            >
              <span>New & Popular</span>
            </Link>

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-300 hover:text-white p-2 text-left"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
