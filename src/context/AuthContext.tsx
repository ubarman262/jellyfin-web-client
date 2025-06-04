/* eslint-disable react-refresh/only-export-components */
import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import JellyfinApi from "../api/jellyfin";
import { User, UserLogin } from "../types/jellyfin";

import { AuthContext } from "./AuthProvider";


export function AuthProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [jellyfinClient, setJellyfinClient] = useState<JellyfinApi | null>(
    null
  );
  const [serverUrlState, setServerUrlState] = useState<string>(
    () => localStorage.getItem("jellyfin_server_url") ?? ""
  );

  // Keep serverUrl in sync with localStorage
  const setServerUrl = useCallback((url: string) => {
    setServerUrlState(url);
    /*if (url) {
      localStorage.setItem("jellyfin_server_url", url);
    } else {
      localStorage.removeItem("jellyfin_server_url");
    }*/
  }, []);

  useEffect(() => {
    // Always fetch latest serverUrl from localStorage on reload
    //const url = localStorage.getItem("jellyfin_server_url") ?? "";
    setServerUrlState(import.meta.env.VITE_SERVER_URL);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        /*if (!serverUrlState) {
          setIsLoading(false);
          setJellyfinClient(null);
          setUser(null);
          return;
        }*/





        const client = new JellyfinApi({ serverUrl: serverUrlState });
        setJellyfinClient(client);

        // Check if user is already authenticated
        if (client.isAuthenticated()) {
          setIsAuthenticated(true);
          // We don't have the full user object here, but we know they're authenticated
        }

        const storedUser = localStorage.getItem("jellyfin_user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [serverUrlState]);

  const login = async (credentials: UserLogin) => {
    if (!jellyfinClient) throw new Error("API not initialized");

    setIsLoading(true);
    try {
      const authResult = await jellyfinClient.login(credentials);
      setUser(authResult.User);
      localStorage.setItem("jellyfin_user", JSON.stringify(authResult.User));
      setIsAuthenticated(true);
      localStorage.setItem("jellyfin_user", JSON.stringify(authResult.User));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!jellyfinClient) return;
    setIsLoading(true);
    try {
      await jellyfinClient.logout();
    } finally {
      setUser(null);
      localStorage.removeItem("jellyfin_user");
      setIsLoading(false);
      setIsAuthenticated(false);
      localStorage.removeItem("jellyfin_user");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        api: jellyfinClient,
        isAuthenticated,
        isLoading,
        user,
        jellyfinClient,
        serverUrl: serverUrlState,
        setServerUrl,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
