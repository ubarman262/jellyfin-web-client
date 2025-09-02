import React, { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "../components/layout/Navbar";
import MediaCard from "../components/ui/MediaCard";
import { useMediaData } from "../hooks/useMediaData";
import { FUNNY_ENDING_LINES, MediaItem, MediaType } from "../types/jellyfin";

const PAGE_SIZE = 24;

interface MediaListPageProps {
  mediaType: MediaType;
}

const MediaListPage: React.FC<MediaListPageProps> = ({ mediaType }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // Multi-select genre filter state
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const genreMenuRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const genres = useMediaData("genres", { mediaType }).items.map((g) => g.Name);

  // Fetch movies for current page/genre(s)
  const {
    items: fetchedItems,
    isLoading,
    totalItems,
  } = useMediaData(mediaType, {
    limit: PAGE_SIZE,
    startIndex: page * PAGE_SIZE,
    genres: selectedGenres.length > 0 ? selectedGenres : undefined,
  });

  // Reset everything when mediaType changes (route change)
  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    setSelectedGenres([]);
  }, [mediaType]);

  // Reset items/page/hasMore when genres change (but not mediaType)
  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
  }, [selectedGenres]);

  // Append new items when fetched, deduplicating by Id
  useEffect(() => {
    if (page === 0) {
      setItems(fetchedItems);
    } else if (fetchedItems.length > 0) {
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.Id));
        const newItems = fetchedItems.filter(
          (item) => !existingIds.has(item.Id)
        );
        return [...prev, ...newItems];
      });
    }
    // Use totalItems to determine if there are more items
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
    [isLoading, hasMore]
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

  // Close genre menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        genreMenuRef.current &&
        !genreMenuRef.current.contains(event.target as Node)
      ) {
        setGenreMenuOpen(false);
      }
    }
    if (genreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [genreMenuOpen]);

  // Pick a random funny line for the end message
  const endLine = React.useMemo(() => {
    if (!hasMore && !isLoading && items.length > 0) {
      if (mediaType === "movies") {
        const idx = Math.floor(
          Math.random() * FUNNY_ENDING_LINES.movies.length
        );
        return FUNNY_ENDING_LINES.movies[idx].replace(
          "{count}",
          totalItems.toString()
        );
      } else if (mediaType === "series") {
        const idx = Math.floor(
          Math.random() * FUNNY_ENDING_LINES.series.length
        );
        return FUNNY_ENDING_LINES.series[idx].replace(
          "{count}",
          totalItems.toString()
        );
      }
    }
    return null;
  }, [hasMore, isLoading, items.length, totalItems, mediaType]);

  // Handle genre checkbox toggle
  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
    setPage(0);
  };

  // Handle "All" click
  const handleAllGenres = () => {
    if (selectedGenres.length === 0) return;
    setSelectedGenres([]);
    setPage(0);
    setGenreMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16 pl-16 pr-16">
        {/* Genre Dropdown Menu */}
        <div className="relative mb-8" ref={genreMenuRef}>
          <button
            className="flex items-center gap-2 px-6 py-2 bg-neutral-900 border border-gray-400 rounded text-lg font-semibold focus:outline-none"
            onClick={() => setGenreMenuOpen((open) => !open)}
          >
            Genres
            <svg
              className={`w-4 h-4 transition-transform ${
                genreMenuOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
            {selectedGenres.length > 0 && (
              <span className="ml-2 text-sm text-gray-400">
                {selectedGenres.join(", ")}
              </span>
            )}
          </button>
          {genreMenuOpen && (
            <div className="absolute z-20 mt-2 left-0 bg-neutral-900 border border-gray-700 rounded shadow-lg py-4 px-8 min-w-[340px] max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
                <button
                  className={`text-left py-1 px-2 rounded hover:bg-gray-800 ${
                    selectedGenres.length === 0
                      ? "font-bold text-white"
                      : "text-gray-200"
                  }`}
                  onClick={handleAllGenres}
                  disabled={genres.length === 0}
                >
                  All
                </button>
                {genres.length === 0 ? (
                  <span className="col-span-3 text-gray-400">Loading...</span>
                ) : (
                  genres.map((genre) => (
                    <label
                      key={genre}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-800 cursor-pointer text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(genre)}
                        onChange={() => toggleGenre(genre)}
                        className="accent-pink-500"
                      />
                      <span
                        className={
                          selectedGenres.includes(genre)
                            ? "font-bold text-white"
                            : ""
                        }
                      >
                        {genre}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {(() => {
          if (items.length === 0 && isLoading) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {items.map((item) => (
                    <MediaCard key={item.Id} item={item} />
                  ))}
                </div>
                {/* Loader for infinite scroll */}
                <div ref={loaderRef} />
                {isLoading && (
                  <div className="flex justify-center mt-8">
                    <div className="w-8 h-8 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
                {!hasMore && !isLoading && items.length > 0 && (
                  <div className="text-center py-8 text-gray-400">
                    {endLine}
                  </div>
                )}
              </>
            );
          } else {
            return (
              <div className="text-center py-12 text-gray-400">
                No movies found.
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
};

export default MediaListPage;
