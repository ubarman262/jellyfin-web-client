
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import JellyfinVideoPlayer from "../components/ui/JellyfinVideoPlayer";

const ExperimentalPlayerPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { api } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItem() {
      if (!api || !itemId) return;
      setLoading(true);
      try {
        const result = await api.getMediaItem(itemId);
        setItem(result);
      } catch (err) {
        setItem(null);
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [api, itemId]);

  if (loading) return <div className="text-center mt-20 text-gray-400">Loading...</div>;
  if (!item) return <div className="text-center mt-20 text-gray-400">No video found.</div>;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <JellyfinVideoPlayer item={item} />
    </div>
  );
};

export default ExperimentalPlayerPage;
