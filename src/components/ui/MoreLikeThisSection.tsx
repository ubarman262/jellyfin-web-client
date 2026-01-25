import React, { useEffect, useRef, useState } from "react";
import { ItemsResponse, MediaItem } from "../../types/jellyfin";
import MediaRow from "./MediaRow";
import { useAuth } from "../../context/AuthContext";

interface MoreLikeThisSectionProps {
  item: MediaItem;
  isActive?: boolean;
  onSelectItem?: (itemId: string) => void; // <-- add prop
  onSimilarStateChange?: (state: { isLoading: boolean }) => void;
}

const MoreLikeThisSection: React.FC<MoreLikeThisSectionProps> = ({
  item,
  isActive = false,
  onSelectItem,
  onSimilarStateChange,
}) => {
  const { api } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cache = useRef<Record<string, MediaItem[]>>({});

  useEffect(() => {
    onSimilarStateChange?.({ isLoading });
  }, [isLoading, onSimilarStateChange]);

  useEffect(() => {
    let cancelled = false;
    const fetchSimilar = async () => {
      if (!api || !item) {
        setItems([]);
        setIsLoading(false);
        return;
      }
      const id = item.Type === "Episode" ? item.SeriesId : item.Id;
      if (!id) {
        setItems([]);
        setIsLoading(false);
        return;
      }
      if (cache.current[id]) {
        setItems(cache.current[id]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res: ItemsResponse = await api.getSimilarItems(id, 12);
        const filtered = res.Items.filter((m) => m.Id !== id);
        if (!cancelled) {
          cache.current[id] = filtered;
          setItems(filtered);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSimilar();
    return () => {
      cancelled = true;
    };
  }, [api, item]);

  if (!isActive) {
    return null;
  }

  return (
    <div>
      {item.Type === "Episode" && item.SeriesId && (
        <h3 className="text-xl font-semibold text-white mb-4">
          More like this
        </h3>
      )}
      <MediaRow
        title=""
        items={items}
        isLoading={isLoading}
        onSelectItem={onSelectItem} // <-- pass handler
      />
    </div>
  );
};

export default MoreLikeThisSection;
