import React, { useCallback, useEffect, useRef, useState } from "react";
import MediaCard from "../components/ui/MediaCard";
import PageTemplate from "../components/layout/PageTemplate";
import { useMediaData } from "../hooks/useMediaData";
import { MediaItem } from "../types/jellyfin";

const PAGE_SIZE = 24;

const CollectionsPage: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const {
    items: fetchedItems,
    isLoading,
    totalItems,
  } = useMediaData("collections", {
    limit: PAGE_SIZE,
    startIndex: page * PAGE_SIZE,
  });

  // Append new items when fetched, deduplicating by Id
  useEffect(() => {
    if (page === 0) {
      setItems(fetchedItems);
    } else if (fetchedItems.length > 0) {
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.Id));
        const newItems = fetchedItems.filter(
          (item) => !existingIds.has(item.Id),
        );
        return [...prev, ...newItems];
      });
    }

    if (items.length + fetchedItems.length >= totalItems) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedItems, page, totalItems]);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !isLoading && hasMore) {
        setPage((prev) => prev + 1);
      }
    },
    [isLoading, hasMore],
  );

  useEffect(() => {
    const option = { root: null, rootMargin: "200px", threshold: 0 };
    const observer = new window.IntersectionObserver(handleObserver, option);
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [handleObserver, items.length, hasMore]);

  return (
    <PageTemplate>
      <div className="pt-24 pb-16 px-14">
        {(() => {
          const gridClasses =
            "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-8";

          if (items.length === 0 && isLoading) {
            return (
              <div className={gridClasses}>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => {
                  const skeletonKey = `skeleton-${page}-${i}`;
                  return (
                    <div
                      key={skeletonKey}
                      className="w-full aspect-[2/3] bg-gray-800 animate-pulse rounded-md"
                    ></div>
                  );
                })}
              </div>
            );
          } else if (items.length > 0) {
            return (
              <>
                <div className={gridClasses}>
                  {items.map((item) => (
                    <MediaCard key={item.Id} item={item} fluid />
                  ))}
                </div>
                <div ref={loaderRef} />
                {isLoading && (
                  <div className="flex justify-center mt-8">
                    <div className="w-8 h-8 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
                {!hasMore && !isLoading && items.length > 0 && (
                  <div className="text-center py-8 text-gray-400 w-full">
                    You have reached the end.
                  </div>
                )}
              </>
            );
          } else {
            return (
              <div className="text-center py-12 text-gray-400">
                No collections found.
              </div>
            );
          }
        })()}
      </div>
    </PageTemplate>
  );
};

export default CollectionsPage;
