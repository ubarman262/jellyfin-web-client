import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";
import MediaRow from "./MediaRow";

interface CollectionSectionProps {
  item?: MediaItem | null;
  isMovie: boolean;
  isActive?: boolean;
  onSelectItem?: (itemId: string) => void;
  onCollectionStateChange?: (state: {
    hasBoxSet: boolean;
    isLoading: boolean;
    title: string;
  }) => void;
}

const CollectionSection: React.FC<CollectionSectionProps> = ({
  item,
  isMovie,
  isActive = false,
  onSelectItem,
  onCollectionStateChange,
}) => {
  const { api } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("Collection");
  const cache = useRef<Record<string, MediaItem[]>>({});
  const titleCache = useRef<Record<string, string>>({});

  const hasBoxSet = items.length > 0;

  useEffect(() => {
    onCollectionStateChange?.({
      hasBoxSet,
      isLoading,
      title,
    });
  }, [hasBoxSet, isLoading, title, onCollectionStateChange]);

  useEffect(() => {
    let cancelled = false;
    const fetchCollection = async () => {
      if (!api || !item?.Id || !isMovie) {
        setItems([]);
        setIsLoading(false);
        setTitle("Collection");
        return;
      }

      if (cache.current[item.Id]) {
        setItems(cache.current[item.Id]);
        setIsLoading(false);
        setTitle(titleCache.current[item.Id] ?? "Collection");
        return;
      }

      setIsLoading(true);
      try {
        const collection = await api.findBoxSetItemsByChildId(item.Id);
        const boxSetId = api.getMarlinResultId(collection);
        const boxSetTitle = api.getMarlinResultTitle(collection);
        if (!boxSetId) {
          setItems([]);
          setIsLoading(false);
          setTitle("Collection");
          return;
        }
        let movies = await api.getBoxSetMovies(boxSetId);
        movies = movies.slice().sort((a, b) => {
          const aYear =
            a.ProductionYear ??
            (a.PremiereDate ? new Date(a.PremiereDate).getFullYear() : 0);
          const bYear =
            b.ProductionYear ??
            (b.PremiereDate ? new Date(b.PremiereDate).getFullYear() : 0);
          if (aYear !== bYear) return aYear - bYear;
          if (a.PremiereDate && b.PremiereDate) {
            return (
              new Date(a.PremiereDate).getTime() -
              new Date(b.PremiereDate).getTime()
            );
          }
          return 0;
        });

        if (!cancelled) {
          cache.current[item.Id] = movies;
          titleCache.current[item.Id] = boxSetTitle ?? "Collection";
          setItems(movies);
          setTitle(boxSetTitle ?? "Collection");
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setTitle("Collection");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCollection();
    return () => {
      cancelled = true;
    };
  }, [api, item, isMovie]);

  if (!isActive || !hasBoxSet) {
    return null;
  }

  return (
    <div>
      <MediaRow
        title=""
        items={items}
        isLoading={isLoading}
        onSelectItem={onSelectItem}
      />
    </div>
  );
};

export default CollectionSection;
