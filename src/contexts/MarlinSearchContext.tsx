import React, { createContext, useContext, useState, useEffect } from 'react';
import { MarlinSearchConfig } from '../api/marlin-search';

interface MarlinSearchContextType {
  config: MarlinSearchConfig | null;
  setConfig: (config: MarlinSearchConfig | null) => void;
  isConfigured: boolean;
}

const MarlinSearchContext = createContext<MarlinSearchContextType | undefined>(undefined);

export const useMarlinSearch = () => {
  const context = useContext(MarlinSearchContext);
  if (!context) {
    throw new Error('useMarlinSearch must be used within a MarlinSearchProvider');
  }
  return context;
};

interface MarlinSearchProviderProps {
  children: React.ReactNode;
}

export const MarlinSearchProvider: React.FC<MarlinSearchProviderProps> = ({ children }) => {
  const [config, setConfigState] = useState<MarlinSearchConfig | null>(null);

  useEffect(() => {
    // Load config from localStorage on mount
    const savedConfig = localStorage.getItem('marlinSearchConfig');
    if (savedConfig) {
      try {
        setConfigState(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Failed to parse saved MarlinSearch config:', error);
      }
    }
  }, []);

  const setConfig = (newConfig: MarlinSearchConfig | null) => {
    setConfigState(newConfig);
    if (newConfig) {
      localStorage.setItem('marlinSearchConfig', JSON.stringify(newConfig));
    } else {
      localStorage.removeItem('marlinSearchConfig');
    }
  };

  const isConfigured = config !== null && config.baseUrl.length > 0;

  return (
    <MarlinSearchContext.Provider value={{ config, setConfig, isConfigured }}>
      {children}
    </MarlinSearchContext.Provider>
  );
};
