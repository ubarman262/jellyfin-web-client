import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, matchPath } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MediaDetailsPage from "./pages/MediaDetailsPage";
import MediaPlayerPage from "./pages/MediaPlayerPage";
import MoviesPage from "./pages/MoviesPage";
import PersonDetailsPage from "./pages/PersonDetailsPage";
import SearchPage from "./pages/SearchPage";
import ShowsPage from "./pages/ShowsPage";
import AddServerPage from "./pages/AddServerPage";
import "@fortawesome/fontawesome-free/css/all.min.css";
import FavouritesPage from "./pages/FavouritesPage";
import { RecoilRoot } from "recoil";
import MediaDetailsDrawer from "./components/ui/MediaDetailsDrawer";

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// App wrapper with AuthProvider
const AppWrapper: React.FC = () => {
  // No need to fetch serverUrl here, context will handle it
  return (
    <RecoilRoot>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </RecoilRoot>
  );
};

// Main App component
const App: React.FC = () => {
  const location = useLocation();
  const isPlayerPage = !!matchPath("/play/:itemId", location.pathname);

  return (
    <>
      {!isPlayerPage && <MediaDetailsDrawer />}

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/movies"
          element={
            <ProtectedRoute>
              <MoviesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shows"
          element={
            <ProtectedRoute>
              <ShowsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/favourites"
          element={
            <ProtectedRoute>
              <FavouritesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/latest"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/details/:itemId"
          element={
            <ProtectedRoute>
              <MediaDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/person/:personId"
          element={
            <ProtectedRoute>
              <PersonDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/play/:itemId"
          element={
            <ProtectedRoute>
              <MediaPlayerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        <Route path="/add-server" element={<AddServerPage />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* Redirect all other routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default AppWrapper;
