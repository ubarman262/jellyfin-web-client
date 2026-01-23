import { AlertCircle, Server } from "lucide-react";
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AddServerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  const [serverUrlState, setServerUrlState] = useState(
    searchParams.get("server_url") || localStorage.getItem("jellyfin_server_url") || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { setServerUrl } = useAuth();
  const navigate = useNavigate();

  const connectToServer = async () => {
    setError(null);
    setIsConnecting(true);
    
    try {
      const url = serverUrlState.replace(/\/+$/, ""); // Remove trailing slash
      
      // Create AbortController for 15-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Test connection to Jellyfin server
      const res = await fetch(`${url}/System/Info/public`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      
      // Verify it's actually a Jellyfin server by checking the response
      const serverInfo = await res.json();
      if (!serverInfo.ServerName && !serverInfo.Version) {
        throw new Error("Server does not appear to be a Jellyfin server");
      }
      
      // Save server URL and update context
      localStorage.setItem("jellyfin_server_url", url);
      setServerUrl(url);
      
      // Navigate to login page
      navigate("/login");
      
    } catch (err) {
      console.error("Connection failed:", err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError("Connection timed out after 15 seconds. Please check the URL and try again.");
      } else {
        setError("Could not connect to the Jellyfin server. Please verify the URL is correct and the server is running.");
      }
    } finally {
      setIsConnecting(false);
    }
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
              connectToServer();
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
              disabled={isConnecting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddServerPage;
