import React, { createContext, useContext, useState, useEffect } from 'react';
import { MarlinSearchConfig } from '../api/marlin-search';

const USER_SETTINGS_KEY = 'jellyfin_user_settings';

type PluginSettings = {
  enabled: boolean;
  config?: MarlinSearchConfig | null;
};

type UserSettings = {
  plugins?: {
    marlinSearch?: PluginSettings;
  };
};

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
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Load config from localStorage on mount
    const raw = localStorage.getItem(USER_SETTINGS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserSettings;
        const plugin = parsed.plugins?.marlinSearch;
        if (plugin?.config) {
          setConfigState(plugin.config);
        }
        setEnabled(plugin?.enabled ?? false);
      } catch (error) {
        console.error('Failed to parse saved MarlinSearch config:', error);
      }
    }

    if (!raw) {
      const legacy = localStorage.getItem('marlinSearchConfig');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy) as MarlinSearchConfig;
          setConfigState(parsed);
          setEnabled(true);
          const updated: UserSettings = {
            plugins: {
              marlinSearch: {
                enabled: true,
                config: parsed,
              },
            },
          };
          localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(updated));
          localStorage.removeItem('marlinSearchConfig');
        } catch (error) {
          console.error('Failed to parse saved MarlinSearch config:', error);
        }
      }
    }
  }, []);

  const setConfig = (newConfig: MarlinSearchConfig | null) => {
    setConfigState(newConfig);
    const raw = localStorage.getItem(USER_SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as UserSettings) : {};
    const updated: UserSettings = {
      ...parsed,
      plugins: {
        ...parsed.plugins,
        marlinSearch: {
          enabled: newConfig ? true : parsed.plugins?.marlinSearch?.enabled ?? false,
          config: newConfig,
        },
      },
    };
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(updated));
  };

  const isConfigured = enabled && config !== null && config.baseUrl.length > 0;

  return (
    <MarlinSearchContext.Provider value={{ config, setConfig, isConfigured }}>
      {children}
    </MarlinSearchContext.Provider>
  );
};
