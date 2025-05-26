import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { MediaItem, ItemsResponse } from "../../types/jellyfin";
import MediaRow from "./MediaRow";

interface MoreLikeThisSectionProps {
  item: MediaItem;
}

const MoreLikeThisSection: React.FC<MoreLikeThisSectionProps> = ({ item }) => {
  const { api } = useAuth();
  const [similar, setSimilar] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !item) {
      setSimilar([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const fetchSimilar = async () => {
      try {
        const id =
          item.Type === "Episode"
            ? item.SeriesId
            : item.Id;
        if (!id) {
          if (!cancelled) setSimilar([]);
          if (!cancelled) setLoading(false);
          return;
        }
        const res: ItemsResponse = await api.getSimilarItems(id, 12);
        // Exclude the current movie itself, just in case
        const filtered = res.Items.filter((m) => m.Id !== id);
        if (!cancelled) setSimilar(filtered);
      } catch {
        if (!cancelled) setSimilar([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSimilar();
    return () => {
      cancelled = true;
    };
  }, [api, item]);

  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-4">More like this</h3>
      <MediaRow title="" items={similar} isLoading={loading} />
    </div>
  );
};

export default MoreLikeThisSection;
