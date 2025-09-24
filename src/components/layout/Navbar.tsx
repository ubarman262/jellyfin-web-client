import clsx from "clsx";
import {
  ChevronDown,
  Film,
  GalleryThumbnails,
  Heart,
  Library,
  LogOut,
  Menu,
  Search,
  Tv,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import JellyfinApi from "../../api/jellyfin";

const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const storedUser = localStorage.getItem("jellyfin_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Close menus when location changes
    setIsMenuOpen(false);
    setShowUserMenu(false);
  }, [location]);

  useEffect(() => {
    // Fetch user profile pic if authenticated and user info is available
    if (isAuthenticated && user?.Id && user?.PrimaryImageTag) {
      const serverUrl = localStorage.getItem("jellyfin_server_url") ?? "";
      const api = new JellyfinApi({ serverUrl });
      setProfilePicUrl(api.getUserImageUrl(user.Id, user.PrimaryImageTag));
    } else {
      setProfilePicUrl(null);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = () => {
    navigate(`/search`);
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
        "sticky top-0 z-50 transition-all duration-300",
        !isScrolled
          ? "bg-gradient-to-b from-black/80 to-transparent border-0 border-transparent"
          : "backdrop-blur-[5px] backdrop-saturate-[0.8] bg-[#171717]/90 shadow-[0_4px_30px_rgba(0,0,0,0.1)] border-b border-white/20",
        "-mb-16"
      )}
    >
      <div className="px-14">
        <div className="flex items-center justify-between h-16 navbar-class">
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
              Shows
            </Link>
            <Link
              to="/favourites"
              className={clsx(
                "text-sm font-medium hover:text-white transition-colors",
                location.pathname === "/favourites"
                  ? "text-white"
                  : "text-gray-300"
              )}
            >
              Favourites
            </Link>
            <Link
              to="/collections"
              className={clsx(
                "text-sm font-medium hover:text-white transition-colors",
                location.pathname === "/collections"
                  ? "text-white"
                  : "text-gray-300"
              )}
            >
              Collections
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => handleSearch()}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            </div>

            {/* User Profile */}
            {isAuthenticated && (
              <div className="relative">
                <div className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors">
                  <div
                    className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-medium overflow-hidden cursor-pointer"
                    onClick={() => {
                      if (window.innerWidth >= 768)
                        setShowUserMenu(!showUserMenu);
                    }}
                    tabIndex={0}
                  >
                    {profilePicUrl ? (
                      <img
                        src={profilePicUrl}
                        alt={user?.Name}
                        className="w-8 h-8 object-cover rounded-full"
                      />
                    ) : (
                      getUserInitial()
                    )}
                  </div>
                  {/* Hide ChevronDown on mobile (md:hidden) */}
                  <span
                    className="hidden md:inline-flex cursor-pointer"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <ChevronDown size={16} />
                  </span>
                </div>
                {showUserMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-gray-900 rounded-md shadow-lg overflow-hidden z-50">
                    <div
                      className="p-3 border-b border-gray-800 cursor-pointer"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/profile");
                      }}
                    >
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
      <div
        className={clsx(
          "md:hidden fixed inset-0 z-30 flex",
          isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!isMenuOpen}
      >
        {/* Overlay */}
        <div
          className={clsx(
            "absolute inset-0 bg-black/60 transition-opacity duration-300",
            isMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsMenuOpen(false)}
        />
        {/* Animated Menu */}
        <div
          className={clsx(
            "relative w-full bg-black/95 backdrop-blur-sm transition-all duration-300 transform",
            isMenuOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-8 opacity-0"
          )}
        >
          {isMenuOpen && (
            <nav className="container mx-auto px-4 py-3 flex flex-col space-y-6">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="flex justify-end items-center gap-2 text-gray-300 hover:text-white p-2"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.3s 0.05s, transform 0.3s 0.05s",
                }}
              >
                <X size={22} />
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 text-2xl font-bold text-gray-300 hover:text-white p-2"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.3s 0.1s, transform 0.3s 0.1s",
                }}
              >
                <GalleryThumbnails size={22} strokeWidth={2.5} />
                Home
              </Link>
              <Link
                to="/movies"
                className="flex items-center gap-2 text-2xl font-bold text-gray-300 hover:text-white p-2"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.3s 0.18s, transform 0.3s 0.18s",
                }}
              >
                <Film size={22} strokeWidth={2.5} />
                <span>Movies</span>
              </Link>
              <Link
                to="/shows"
                className="flex items-center gap-2 text-2xl font-bold text-gray-300 hover:text-white p-2"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.3s 0.26s, transform 0.3s 0.26s",
                }}
              >
                <Tv size={22} strokeWidth={2.5} />
                <span>Shows</span>
              </Link>
              <Link
                to="/favourites"
                className="flex items-center gap-2 text-2xl font-bold text-gray-300 hover:text-white p-2"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.3s 0.34s, transform 0.3s 0.34s",
                }}
              >
                <Heart size={22} strokeWidth={2.5} />
                <span>Favourites</span>
              </Link>
              <Link
                to="/collections"
                className="flex items-center gap-2 text-2xl font-bold text-gray-300 hover:text-white p-2"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.3s 0.42s, transform 0.3s 0.42s",
                }}
              >
                <Library size={22} strokeWidth={2.5} />
                <span>Collections</span>
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 text-2xl font-bold text-gray-300 hover:text-white p-2"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.3s 0.42s, transform 0.3s 0.42s",
                }}
              >
                <User size={22} strokeWidth={2.5} />
                <span>Profile</span>
              </Link>

              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-2xl font-bold text-gray-300 hover:text-white p-2"
                  style={{
                    opacity: isMenuOpen ? 1 : 0,
                    transform: isMenuOpen
                      ? "translateY(0)"
                      : "translateY(20px)",
                    transition: "opacity 0.3s 0.5s, transform 0.3s 0.5s",
                  }}
                >
                  <LogOut size={22} strokeWidth={2.5} />
                  <span>Sign Out</span>
                </button>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
