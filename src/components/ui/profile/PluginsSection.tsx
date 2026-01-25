import React, { useState, useEffect } from "react";
import {
  createMarlinSearchClient,
  MarlinSearchConfig,
} from "../../../api/marlin-search";

const USER_SETTINGS_KEY = "jellyfin_user_settings";

type PluginSettings = {
  enabled: boolean;
  config?: MarlinSearchConfig | null;
};

type UserSettings = {
  plugins?: {
    marlinSearch?: PluginSettings;
  };
};

function readUserSettings(): UserSettings {
  if (globalThis.window === undefined) return {};
  try {
    const raw = localStorage.getItem(USER_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UserSettings;
  } catch {
    return {};
  }
}

function writeUserSettings(settings: UserSettings) {
  if (globalThis.window === undefined) return;
  localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
  globalThis.window.dispatchEvent(new Event("user-settings-updated"));
}

const PluginsSection: React.FC = () => {
  const [configState, setConfigState] = useState<MarlinSearchConfig | null>(
    null,
  );
  const [isEnabled, setIsEnabled] = useState(false);
  const [formData, setFormData] = useState({
    baseUrl: "",
    authToken: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load config from localStorage on mount
  useEffect(() => {
    const settings = readUserSettings();
    const plugin = settings.plugins?.marlinSearch;
    const existingConfig = plugin?.config ?? null;
    const enabled = plugin?.enabled ?? false;

    if (existingConfig) {
      setConfigState(existingConfig);
      setFormData({
        baseUrl: existingConfig.baseUrl || "",
        authToken: existingConfig.authToken || "",
      });
    }
    setIsEnabled(enabled);

    if (!plugin?.config) {
      const legacy = localStorage.getItem("marlinSearchConfig");
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy) as MarlinSearchConfig;
          setConfigState(parsed);
          setFormData({
            baseUrl: parsed.baseUrl || "",
            authToken: parsed.authToken || "",
          });
          setIsEnabled(true);
          writeUserSettings({
            ...settings,
            plugins: {
              ...settings.plugins,
              marlinSearch: {
                enabled: true,
                config: parsed,
              },
            },
          });
          localStorage.removeItem("marlinSearchConfig");
        } catch (error) {
          console.error("Failed to parse saved MarlinSearch config:", error);
        }
      }
    }
  }, []);

  const setConfig = (newConfig: MarlinSearchConfig | null) => {
    setConfigState(newConfig);
    const current = readUserSettings();
    writeUserSettings({
      ...current,
      plugins: {
        ...current.plugins,
        marlinSearch: {
          enabled: newConfig ? true : current.plugins?.marlinSearch?.enabled ?? false,
          config: newConfig,
        },
      },
    });
  };

  const setEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    const current = readUserSettings();
    writeUserSettings({
      ...current,
      plugins: {
        ...current.plugins,
        marlinSearch: {
          enabled,
          config: current.plugins?.marlinSearch?.config ?? configState,
        },
      },
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setTestResult(null);
  };

  const testConnection = async () => {
    if (!formData.baseUrl.trim()) {
      setTestResult({ success: false, message: "Please enter a Marlin URL" });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const client = createMarlinSearchClient({
        baseUrl: formData.baseUrl.trim(),
        authToken: formData.authToken.trim() || undefined,
      });

      const status = await client.checkStatus();
      setTestResult({ success: true, message: "Connection successful!" });
      console.log(status);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = () => {
    if (!testResult?.success) {
      setTestResult({
        success: false,
        message: "Please test the connection before saving",
      });
      return;
    }

    const newConfig = {
      baseUrl: formData.baseUrl.trim(),
      authToken: formData.authToken.trim() || undefined,
    };

    setConfig(newConfig);
    setEnabled(true);
    setTestResult({
      success: true,
      message: "Configuration saved successfully!",
    });
  };

  const clearConfiguration = () => {
    setConfig(null);
    setEnabled(false);
    setFormData({ baseUrl: "", authToken: "" });
    setTestResult(null);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Marlin-Search Configuration
          </h2>
          <p className="text-zinc-400 mb-6">
            Configure your Marlin-Search instance for enhanced search
            capabilities.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Enable Marlin-Search</p>
            <p className="text-xs text-zinc-400">
              Quickly turn the plugin on or off without removing your settings.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isEnabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-red-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="baseUrl"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Marlin URL *
            </label>
            <input
              type="url"
              id="baseUrl"
              name="baseUrl"
              value={formData.baseUrl}
              onChange={handleInputChange}
              placeholder="https://your-marlin-instance.com"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="authToken"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Authentication Token (optional)
            </label>
            <input
              type="password"
              id="authToken"
              name="authToken"
              value={formData.authToken}
              onChange={handleInputChange}
              placeholder="Enter your auth token"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-md ${
              testResult.success
                ? "bg-green-900/20 border border-green-500 text-green-400"
                : "bg-red-900/20 border border-red-500 text-red-400"
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={testConnection}
            disabled={isLoading || !formData.baseUrl.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white rounded-md transition-colors"
          >
            {isLoading ? "Testing..." : "Test Connection"}
          </button>

          <button
            onClick={saveConfiguration}
            disabled={!testResult?.success}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white rounded-md transition-colors"
          >
            Save Configuration
          </button>

          {configState && (
            <button
              onClick={clearConfiguration}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Clear Configuration
            </button>
          )}
        </div>

        {configState && (
          <div className="p-4 bg-zinc-800 rounded-md">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">
              Current Configuration
            </h3>
            <p className="text-sm text-zinc-400">URL: {configState.baseUrl}</p>
            {configState.authToken && (
              <p className="text-sm text-zinc-400">
                Token: {"*".repeat(configState.authToken.length)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginsSection;
