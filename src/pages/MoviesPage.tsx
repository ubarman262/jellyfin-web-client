import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import MediaCard from "../components/ui/MediaCard";
import MoreInfoButton from "../components/ui/moreInfoButton";
import PlayButton from "../components/ui/playButton";
import YouTubeWithProgressiveFallback from "../components/ui/YouTubeWithProgressiveFallback";
import { useAuth } from "../context/AuthContext";
import { useMediaData } from "../hooks/useMediaData";
import activeItem from "../states/atoms/ActiveItem";
import drawerState from "../states/atoms/DrawerOpen";
import { FUNNY_ENDING_LINES_MOVIES, MediaItem } from "../types/jellyfin";

const PAGE_SIZE = 30;
const FILTERED_PAGE_SIZE = 1000;

const MoviesPage: React.FC = () => {
  const { api } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // Multi-select genre filter state
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const genreMenuRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const genres = useMediaData("genres", { mediaType: "Movie" }).items.map(
    (g) => g.Name
  );

  const featureFilter = "latest";

  const { items: defaultFeaturedItems } = useMediaData(featureFilter, {
    mediaType: "Movie",
    limit: 3,
  });

  // Compute featuredItems based on selectedGenres
  const featuredItems =
    selectedGenres.length > 0
      ? items // no limit when genre filter is present
      : defaultFeaturedItems;

  // Remove itemRef logic and use a state for the preview item
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Track previous featuredItems and selectedGenres to detect real changes
  const prevFeaturedItemsRef = useRef<MediaItem[]>([]);
  const prevGenresRef = useRef<string[]>([]);

  useEffect(() => {
    // Only update preview if:
    // - The genre filter changes
    // - The featuredItems array changes (by length or content)
    const prevGenres = prevGenresRef.current;
    const prevFeaturedItems = prevFeaturedItemsRef.current;

    const genresChanged =
      prevGenres.length !== selectedGenres.length ||
      prevGenres.some((g, i) => g !== selectedGenres[i]);
    const itemsChanged =
      prevFeaturedItems.length !== featuredItems.length ||
      prevFeaturedItems.some((item, i) => item.Id !== featuredItems[i]?.Id);

    if ((genresChanged || itemsChanged) && featuredItems.length > 0) {
      const randomIdx = Math.floor(Math.random() * featuredItems.length);
      setPreviewItem(featuredItems[randomIdx]);
    }
    // Update refs for next effect run
    prevGenresRef.current = [...selectedGenres];
    prevFeaturedItemsRef.current = [...featuredItems];
  }, [featuredItems, selectedGenres]);

  const item = previewItem;

  const officialRating = item?.OfficialRating ?? [];
  const overview = item?.Overview ?? "";

  // Fetch movies for current page/genre(s)
  const {
    items: fetchedItems,
    isLoading,
    totalItems,
  } = useMediaData("movies", {
    limit: selectedGenres.length > 0 ? FILTERED_PAGE_SIZE : PAGE_SIZE,
    startIndex:
      page * (selectedGenres.length > 0 ? FILTERED_PAGE_SIZE : PAGE_SIZE),
    genres: selectedGenres.length > 0 ? selectedGenres : undefined,
  });

  // Reset items when genres change
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
      const idx = Math.floor(Math.random() * FUNNY_ENDING_LINES_MOVIES.length);
      return FUNNY_ENDING_LINES_MOVIES[idx].replace(
        "{count}",
        totalItems.toString()
      );
    }
    return null;
  }, [hasMore, isLoading, items.length, totalItems]);

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

  const setActiveTiemId = useSetRecoilState(activeItem);
  const [IsDrawerOpen, setIsDrawerOpen] = useRecoilState(drawerState);
  const playerRef = useRef<{ play: () => void; pause: () => void }>(null);
  const youtubeSectionRef = useRef<HTMLDivElement>(null);
  const [isYoutubeVisible, setIsYoutubeVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (playerRef.current) {
      if (IsDrawerOpen || !isYoutubeVisible) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    }
  }, [IsDrawerOpen, isYoutubeVisible]);

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        setIsYoutubeVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    const el = youtubeSectionRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  if (!api || !item) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <Navbar />
        <div className="w-full h-[85vh] bg-neutral-800 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />
      {/* Featured Section */}
      <div className="relative w-full" ref={youtubeSectionRef}>
        {/* Genre Dropdown Menu */}
        <div
          className="px-14 absolute top-20 z-30 flex items-center gap-4"
          ref={genreMenuRef}
        >
          <span className="font-bold text-4xl text-white">Movies</span>
            <button
            className="flex items-center gap-2 px-6 py-2 bg-neutral-900/80 border border-gray-700 rounded text-lg font-semibold focus:outline-none"
            style={{ backdropFilter: "blur(4px)" }}
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
            <div className="absolute z-40 top-[52px] left-[143px] bg-neutral-900 border border-gray-700 rounded shadow-lg py-4 px-8 min-w-[540px] max-h-96 overflow-y-auto">
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
        <div className="w-full relative">
          <YouTubeWithProgressiveFallback
            key={`${location.pathname}-${item?.Id}`}
            item={item}
            aspectRatio="16/8"
            buttonSize={34}
            buttonPosition={{ bottom: "14rem", right: "12rem" }}
            playerRef={playerRef}
          />
          {/* Logo and Overview overlay */}
          {api && item && (
            <div className="absolute px-14 bottom-80 z-10 max-w-2xl">
              {item.ImageTags?.Logo ? (
                <img
                  src={api.getImageUrl(item.Id, "Logo", 400)}
                  alt={item.Name}
                  className="max-h-20 md:max-h-28 w-auto object-contain mb-4"
                  style={{ display: "inline-block" }}
                />
              ) : (
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  {item.Name}
                </h1>
              )}
            </div>
          )}
          <div
            className={clsx(
              "flex items-center gap-3 text-sm text-gray-300 transition-transform duration-700 delay-100 absolute px-14 bottom-72 z-10 max-w-2xl mb-2",
              "translate-y-0 opacity-100"
            )}
          >
            {item.ProductionYear && <span>{item.ProductionYear}</span>}
            {genres?.length > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-500" />
                <span>{genres.slice(0, 3).join(", ")}</span>
              </>
            )}
          </div>
          <p
            className={clsx(
              "text-sm text-gray-300 line-clamp-3 md:line-clamp-4 transition-transform duration-700 delay-200 md:w-3/5 absolute px-14 bottom-60 z-10 max-w-2xl mb-2",
              "translate-y-0 opacity-100"
            )}
            style={{ wordBreak: "break-word", whiteSpace: "pre-line" }}
          >
            {overview.split(" ").length > 20
              ? `${overview.split(" ").slice(0, 20).join(" ")}...`
              : overview}
          </p>
          <div className="absolute px-14 bottom-44 z-10 max-w-2xl flex gap-4">
            <PlayButton
              itemId={item.Id}
              type={item.Type}
              width={200}
              height={50}
            />
            <MoreInfoButton
              onClick={() => {
                setActiveTiemId(item.Id);
                setIsDrawerOpen(true);
              }}
              width={200}
              height={50}
            />
          </div>
          <div>
            <span
              className="absolute right-0 bottom-[14rem] z-10 max-w-2xl w-40"
              style={{
                background: "rgba(55, 65, 81, 0.55)", // bg-gray-700/55
                color: "#fff",
                // borderRadius: "0.375rem", // rounded
                padding: "0.5rem 1.25rem", // px-5 py-2
                fontWeight: 500,
                fontSize: "1.25rem", // text-lg
                letterSpacing: "0.01em",
                display: "inline-block",
                borderLeft: "4px solid rgba(255,255,255,0.5)",
                backdropFilter: "blur(2px)",
              }}
            >
              {officialRating}
            </span>
          </div>
        </div>
        {/* Fade overlay between video and details */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[200px] pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(23,23,23,0) 0%, #171717 90%)",
            zIndex: 10,
            transition: "height 0.3s ease",
          }}
        />
      </div>

      <div className="px-14 -mt-12 pb-16 pl-2 pr-2">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 px-14">
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

export default MoviesPage;
