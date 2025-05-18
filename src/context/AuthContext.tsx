import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import JellyfinApi from '../api/jellyfin';
import { JellyfinAuthResult, UserLogin } from '../types/jellyfin';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: JellyfinAuthResult | null;
  login: (credentials: UserLogin) => Promise<void>;
  logout: () => Promise<void>;
  api: JellyfinApi | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => {},
  logout: async () => {},
  api: null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
  serverUrl: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, serverUrl }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<JellyfinAuthResult | null>(null);
  const [api, setApi] = useState<JellyfinApi | null>(null);

  useEffect(() => {
    // Initialize Jellyfin API
    const jellyfinApi = new JellyfinApi({ serverUrl });
    setApi(jellyfinApi);

    // Check if user is already authenticated
    if (jellyfinApi.isAuthenticated()) {
      setIsAuthenticated(true);
      // We don't have the full user object here, but we know they're authenticated
    }
    
    setIsLoading(false);
  }, [serverUrl]);

  const login = async (credentials: UserLogin) => {
    if (!api) throw new Error('API not initialized');
    
    setIsLoading(true);
    try {
      const authResult = await api.login(credentials);
      setUser(authResult);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!api) return;
    
    setIsLoading(true);
    try {
      await api.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};