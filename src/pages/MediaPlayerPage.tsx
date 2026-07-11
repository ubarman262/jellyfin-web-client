import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import JellyfinPlayer from "../components/ui/JellyfinPlayer/jellyfin-player";
import { Play } from "lucide-react";

const MediaPlayerPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { api, user, serverUrl } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { callbackPath?: string } | null;
  const callbackPath = state?.callbackPath;

  const handleBack = () => {
    if (!itemId) return;
    const basePath = callbackPath ?? "/home";

    navigate(`${basePath}?item=${itemId}`);
  };

  if (!itemId || !api || !user || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Loading player...
      </div>
    );
  }

  const accessToken = api.getAccessToken();
  const userId = user?.Id;
  const deviceId = api.getDeviceId();

  if (!accessToken || !userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Unable to initialize player.
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-black">
      <JellyfinPlayer
        serverUrl={serverUrl}
        itemId={itemId}
        userId={userId}
        accessToken={accessToken}
        deviceId={deviceId}
        showCloseButton={false}
        onBack={handleBack}
        iconTheme="filled"
      />
    </div>
  );
};

export default MediaPlayerPage;
