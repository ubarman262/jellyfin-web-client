import React, { useState, useEffect } from 'react';
import { createMarlinSearchClient, MarlinSearchConfig } from '../../../api/marlin-search';

const MarlinSearchSection: React.FC = () => {
  const [configState, setConfigState] = useState<MarlinSearchConfig | null>(null);
  const [formData, setFormData] = useState({
    baseUrl: '',
    authToken: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('marlinSearchConfig');
    if (savedConfig) {  
      try {
        const parsed = JSON.parse(savedConfig);
        setConfigState(parsed);
        setFormData({
          baseUrl: parsed.baseUrl || '',
          authToken: parsed.authToken || '',
        });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setTestResult(null);
  };

  const testConnection = async () => {
    if (!formData.baseUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter a Marlin URL' });
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
      setTestResult({ success: true, message: 'Connection successful!' });
      console.log(status)
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = () => {
    if (!testResult?.success) {
      setTestResult({ success: false, message: 'Please test the connection before saving' });
      return;
    }

    const newConfig = {
      baseUrl: formData.baseUrl.trim(),
      authToken: formData.authToken.trim() || undefined,
    };

    setConfig(newConfig);
    setTestResult({ success: true, message: 'Configuration saved successfully!' });
  };

  const clearConfiguration = () => {
    setConfig(null);
    setFormData({ baseUrl: '', authToken: '' });
    setTestResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Marlin-Search Configuration</h2>
        <p className="text-zinc-400 mb-6">
          Configure your Marlin-Search instance for enhanced search capabilities.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="baseUrl" className="block text-sm font-medium text-zinc-300 mb-2">
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
          <label htmlFor="authToken" className="block text-sm font-medium text-zinc-300 mb-2">
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
              ? 'bg-green-900/20 border border-green-500 text-green-400'
              : 'bg-red-900/20 border border-red-500 text-red-400'
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
          {isLoading ? 'Testing...' : 'Test Connection'}
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
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Current Configuration</h3>
          <p className="text-sm text-zinc-400">URL: {configState.baseUrl}</p>
          {configState.authToken && (
            <p className="text-sm text-zinc-400">Token: {'*'.repeat(configState.authToken.length)}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MarlinSearchSection;
