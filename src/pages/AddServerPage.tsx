import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Server } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const AddServerPage: React.FC = () => {
  const [serverUrlState, setServerUrlState] = useState(
    localStorage.getItem("jellyfin_server_url") ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { setServerUrl } = useAuth();
  const navigate = useNavigate();

  const testConnection = async () => {
    setError(null);
    setSuccess(false);
    setIsTesting(true);
    try {
      // Try to fetch the /System/Info endpoint as a basic connectivity check
      const url = serverUrlState.replace(/\/+$/, ""); // Remove trailing slash
      const res = await fetch(`${url}/System/Info/public`);
      if (!res.ok) throw new Error("Server did not respond as expected");
      setSuccess(true);
      setServerUrl(serverUrlState); // Update server URL in context
      // Save server URL for later use
      localStorage.setItem("jellyfin_server_url", serverUrlState);
    } catch (err) {
      console.error("Connection test failed:", err);
      setError(
        "Could not connect to the Jellyfin server. Please check the URL and try again."
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleContinue = () => {
    navigate("/login");
  };

  return (
    <div
      className="min-h-screen w-full bg-black flex flex-col items-center justify-center text-white p-4"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-red-600 font-bold text-4xl mb-2">JELLYFLIX</h1>
          <p className="text-gray-400">Add your Jellyfin server</p>
        </div>
        <div className="bg-black/80 rounded-md p-8 backdrop-blur-sm">
          {error && (
            <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded flex items-start gap-2 text-red-100">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              testConnection();
            }}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="serverUrl"
                className="block text-sm font-medium text-gray-400 mb-1"
              >
                Jellyfin Server URL
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">
                  <Server size={18} />
                </span>
                <input
                  id="serverUrl"
                  type="url"
                  placeholder="https://your-jellyfin-server.com"
                  value={serverUrlState}
                  onChange={(e) => setServerUrlState(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the full URL including http:// or https://
              </p>
            </div>
            <button
              type="submit"
              disabled={isTesting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70"
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </button>
            {success && (
              <div className="text-green-400 text-center font-medium">
                Connection successful!
              </div>
            )}
          </form>
          <button
            type="button"
            disabled={!success}
            onClick={handleContinue}
            className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70"
          >
            Continue to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddServerPage;
