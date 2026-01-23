import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, matchPath } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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
import CollectionsPage from "./pages/CollectionsPage";
import ProfilePage from "./pages/ProfilePage";
import ProtectedLayout from "./components/layout/ProtectedLayout";

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

  // Set body background to black on player page
  React.useEffect(() => {
    if (isPlayerPage) {
      document.body.style.backgroundColor = 'black';
    } else {
      document.body.style.backgroundColor = '';
    }
  }, [isPlayerPage]);

  return (
    <>
      {!isPlayerPage && <MediaDetailsDrawer />}

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedLayout>
              <HomePage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/movies"
          element={
            <ProtectedLayout>
              <MoviesPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/shows"
          element={
            <ProtectedLayout>
              <ShowsPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/favourites"
          element={
            <ProtectedLayout>
              <FavouritesPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/collections"
          element={
            <ProtectedLayout>
              <CollectionsPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedLayout>
              <ProfilePage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/latest"
          element={
            <ProtectedLayout>
              <HomePage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/details/:itemId"
          element={
            <ProtectedLayout>
              <MediaDetailsPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/person"
          element={
            <ProtectedLayout>
              <PersonDetailsPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/play/:itemId"
          element={
            <ProtectedLayout>
              <MediaPlayerPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedLayout>
              <SearchPage />
            </ProtectedLayout>
          }
        />

        <Route path="/add-server" element={<AddServerPage />} />

        <Route
          path="/home"
          element={
            <ProtectedLayout>
              <HomePage />
            </ProtectedLayout>
          }
        />

        {/* Redirect all other routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default AppWrapper;
