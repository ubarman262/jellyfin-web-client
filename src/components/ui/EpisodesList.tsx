import { Download, Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";
import MarkWatchedButton from "./MarkWatchedButton";

type Episode = {
  Id: string;
  Name: string;
  RunTimeTicks?: number;
  PremiereDate?: string;
  CommunityRating?: number;
  UserData?: {
    Played?: boolean;
  };
  ImageTags?: {
    Primary?: string;
  };
  ParentIndexNumber?: number;
  IndexNumber?: number;
  Overview?: string;
};

type Season = {
  Id: string;
  Name: string;
  IndexNumber?: number;
};

interface EpisodesListProps {
  readonly seriesId: string;
  initialSeasonId?: string;
  playingNowId?: string;
  variant?: "vertical" | "horizontal";
}

export default function EpisodesList({
  seriesId,
  initialSeasonId,
  playingNowId,
  variant = "vertical",
}: Readonly<EpisodesListProps>) {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(
    initialSeasonId ?? null
  );
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [downloadLoadingMap, setDownloadLoadingMap] = useState<{
    [id: string]: boolean;
  }>({});
  const [watchedMap, setWatchedMap] = useState<{
    [id: string]: boolean;
  }>({});

  // Custom dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ref map for episode items
  const episodeRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Auto-scroll to playing episode
  useEffect(() => {
    if (playingNowId && episodeRefs.current[playingNowId]) {
      if (variant === "horizontal") {
        // For horizontal variant, scroll to center the element in the horizontal container
        episodeRefs.current[playingNowId]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      } else {
        // For vertical variant, use the original behavior
        episodeRefs.current[playingNowId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [playingNowId, episodesLoading, variant]);

  // Keyboard navigation for dropdown
  const handleDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownOpen((open) => !open);
    }
    if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  // Helper function to select the appropriate season
  function selectSeasonBasedOnNextUp(
    items: Season[],
    nextUp: MediaItem[],
    setSelectedSeasonId: (id: string | null) => void
  ) {
    if (nextUp && nextUp.length > 0 && nextUp[0].ParentIndexNumber) {
      // Find the season with IndexNumber matching next up episode's ParentIndexNumber
      const season = items.find(
        (s) => s.IndexNumber === nextUp[0].ParentIndexNumber
      );
      if (season) {
        setSelectedSeasonId(season.Id);
        return;
      }
    }
    // If not watching, select season 1 (IndexNumber === 1)
    const season1 = items.find((s) => s.IndexNumber === 1);
    if (season1) {
      setSelectedSeasonId(season1.Id);
    } else {
      // fallback to first in array
      setSelectedSeasonId(items[0].Id);
    }
  }

  // Fetch seasons on mount or when seriesId changes
  useEffect(() => {
    if (!api || !seriesId) {
      setSeasons([]);
      setSelectedSeasonId(null);
      return;
    }
    setSeasonsLoading(true);
    api
      .getSeasons(seriesId)
      .then((items: Season[]) => {
        setSeasons(items);
        if (!items || items.length === 0) {
          setSelectedSeasonId(null);
          return;
        }
        // Check if user is watching the series (has a next up episode)
        return api.getSeriesNextUp(seriesId, 1).then((nextUp: MediaItem[]) => {
          selectSeasonBasedOnNextUp(items, nextUp, setSelectedSeasonId);
        });
      })
      .catch(() => {
        setSeasons([]);
        setSelectedSeasonId(null);
      })
      .finally(() => setSeasonsLoading(false));
  }, [api, seriesId]);

  // Fetch episodes for selected season
  useEffect(() => {
    if (!api || !seriesId || !selectedSeasonId) {
      setEpisodes([]);
      setWatchedMap({});
      setEpisodesLoading(false);
      return;
    }
    setEpisodesLoading(true);
    api
      .getEpisodes(seriesId, selectedSeasonId)
      .then((eps: Episode[]) => {
        setEpisodes(eps || []);
        // Initialize watched state map
        const newWatchedMap: { [id: string]: boolean } = {};
        eps?.forEach((ep) => {
          newWatchedMap[ep.Id] = !!ep.UserData?.Played;
        });
        setWatchedMap(newWatchedMap);
      })
      .catch(() => {
        setEpisodes([]);
        setWatchedMap({});
      })
      .finally(() => setEpisodesLoading(false));
  }, [api, seriesId, selectedSeasonId]);

  // Extract episodes list rendering logic into a variable
  let episodesListContent: JSX.Element;
  if (episodesLoading) {
    if (variant === "horizontal") {
      episodesListContent = (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-placeholder-${seriesId}-${
                selectedSeasonId ?? "none"
              }-${i}`}
              className="flex-shrink-0 w-60 bg-[#181818] rounded-xl animate-pulse p-3"
            >
              <div className="w-full h-32 bg-gray-800 rounded mb-3" />
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-1/2 mb-1" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      );
    } else {
      episodesListContent = (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-placeholder-${seriesId}-${
                selectedSeasonId ?? "none"
              }-${i}`}
              className="flex flex-row gap-4 items-center px-4 py-3 bg-[#181818] rounded-xl animate-pulse"
            >
              <div className="w-8 h-6 bg-gray-800 rounded" />
              <div className="w-32 h-20 bg-gray-800 rounded" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-800 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-800 rounded w-1/3 mb-1" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <div className="w-6 h-6 bg-gray-800 rounded-full" />
                <div className="w-6 h-6 bg-gray-800 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }
  } else if (episodes.length > 0) {
    if (variant === "horizontal") {
      episodesListContent = (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {episodes.map((ep, idx) => {
            // Calculate runtime in m format
            let runtime = "";
            if (ep.RunTimeTicks) {
              const totalMinutes = Math.floor(
                ep.RunTimeTicks / (10000 * 1000 * 60)
              );
              runtime = `${totalMinutes}m`;
            }
            const watched = watchedMap[ep.Id] ?? !!ep.UserData?.Played;
            const downloadLoading = downloadLoadingMap[ep.Id] || false;
            const isPlaying = playingNowId === ep.Id;

            return (
              <div
                key={ep.Id}
                ref={(el) => {
                  episodeRefs.current[ep.Id] = el;
                }}
                className="flex-shrink-0 w-60 rounded-xl hover:bg-[#232323] transition group p-2"
                style={{ backgroundColor: "rgb(0 0 0 / 0%)" }}
              >
                {/* Thumbnail */}
                <div className="relative w-full h-32 rounded overflow-hidden group mb-3">
                  <button
                    onClick={() => navigate(`/play/${ep.Id}`)}
                    className="w-full h-full p-0 m-0 border-none bg-transparent relative cursor-pointer focus:outline-none"
                    aria-label={`Play ${ep.Name}`}
                    tabIndex={0}
                    style={{ display: "block" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/play/${ep.Id}`);
                      }
                    }}
                  >
                    <img
                      src={
                        ep.ImageTags?.Primary && api
                          ? api.getImageUrl(ep.Id, "Primary", 400)
                          : ""
                      }
                      alt={ep.Name}
                      className="w-full h-full object-cover"
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Play overlay */}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                      >
                        <circle cx="20" cy="20" r="20" fill="rgba(0,0,0,0.5)" />
                        <polygon points="16,13 30,20 16,27" fill="#fff" />
                      </svg>
                    </span>
                    {/* Playing overlay */}
                    {isPlaying && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="text-white text-xs font-bold px-2 py-1 rounded bg-red-600/80">
                          Playing
                        </span>
                      </span>
                    )}
                  </button>
                </div>
                {/* Episode details */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-white truncate">
                      {idx + 1}. {ep.Name}
                    </span>
                    <MarkWatchedButton
                      className="relative bg-white/10 rounded-full p-1 border-0 flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ width: 24, height: 24 }}
                      iconSize={12}
                      item={ep as MediaItem}
                      isWatched={watched}
                      setIsWatched={(newWatched) => {
                        setWatchedMap((prev) => ({
                          ...prev,
                          [ep.Id]:
                            typeof newWatched === "function"
                              ? newWatched(prev[ep.Id] ?? false)
                              : newWatched,
                        }));
                      }}
                    />
                  </div>
                  {runtime && (
                    <span className="text-xs text-gray-400 font-medium">
                      {runtime}
                    </span>
                  )}
                  {/* Episode synopsis */}
                  {ep.Overview && (
                    <div className="text-gray-400 text-xs mt-1 line-clamp-3">
                      {ep.Overview}
                    </div>
                  )}
                  {/* Download button */}
                  <button
                    type="button"
                    className="relative bg-white/10 rounded-full p-2 mt-2 border-1 border-white flex items-center justify-center cursor-pointer self-end"
                    title="Download"
                    aria-label="Download"
                    style={{
                      lineHeight: 0,
                      width: 28,
                      height: 28,
                      transition: "background 0.2s",
                      opacity: downloadLoading ? 0.7 : 1,
                      pointerEvents: downloadLoading ? "none" : "auto",
                    }}
                    onClick={async () => {
                      if (!api || !ep.Id) return;
                      setDownloadLoadingMap((prev) => ({
                        ...prev,
                        [ep.Id]: true,
                      }));
                      try {
                        api.downloadMediaItem(ep.Id);
                      } catch {
                        alert("Failed to start download.");
                      } finally {
                        setTimeout(() => {
                          setDownloadLoadingMap((prev) => ({
                            ...prev,
                            [ep.Id]: false,
                          }));
                        }, 1000);
                      }
                    }}
                    tabIndex={0}
                  >
                    {downloadLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      episodesListContent = (
        <div className="divide-y divide-[#4d4d4d] rounded-xl overflow-hidden mb-10">
          {episodes.map((ep, idx) => {
            // Calculate runtime in m format
            let runtime = "";
            if (ep.RunTimeTicks) {
              const totalMinutes = Math.floor(
                ep.RunTimeTicks / (10000 * 1000 * 60)
              );
              runtime = `${totalMinutes}m`;
            }
            const watched = watchedMap[ep.Id] ?? !!ep.UserData?.Played;
            const downloadLoading = downloadLoadingMap[ep.Id] || false;
            const isPlaying = playingNowId === ep.Id;

            return (
              <div
                key={ep.Id}
                ref={(el) => {
                  episodeRefs.current[ep.Id] = el;
                }}
                className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center group hover:bg-[#232323] transition px-2 py-4 sm:px-4 sm:py-3"
              >
                {/* Thumbnail and play overlay */}
                <div className="relative w-full sm:w-40 h-24 sm:h-20 flex-shrink-0 rounded overflow-hidden group mb-2 sm:mb-0">
                  <button
                    onClick={() => navigate(`/play/${ep.Id}`)}
                    className="w-full h-full p-0 m-0 border-none bg-transparent relative cursor-pointer focus:outline-none"
                    aria-label={`Play ${ep.Name}`}
                    tabIndex={0}
                    style={{ display: "block" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/play/${ep.Id}`);
                      }
                    }}
                  >
                    <img
                      src={
                        ep.ImageTags?.Primary && api
                          ? api.getImageUrl(ep.Id, "Primary", 400)
                          : ""
                      }
                      alt={ep.Name}
                      className="w-full h-full object-cover"
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Play overlay */}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                      >
                        <circle cx="20" cy="20" r="20" fill="rgba(0,0,0,0.5)" />
                        <polygon points="16,13 30,20 16,27" fill="#fff" />
                      </svg>
                    </span>
                    {/* Playing overlay */}
                    {isPlaying && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="text-white text-md font-bold px-2 py-1 rounded bg-red-600/80">
                          Playing
                        </span>
                      </span>
                    )}
                  </button>
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white">
                      {idx + 1}. {ep.Name}
                    </span>
                    {runtime && (
                      <span className="text-xs text-gray-400 font-medium">
                        {runtime}
                      </span>
                    )}
                    {/* Watched tick (right-aligned on mobile) */}
                    <span className="ml-auto sm:hidden flex items-center gap-2">
                      <MarkWatchedButton
                        key={ep.Id}
                        className="relative bg-white/10 rounded-full p-1 ml-2 border-0 flex items-center justify-center cursor-pointer"
                        style={{ width: 32, height: 32 }}
                        iconSize={16}
                        item={ep as MediaItem}
                        isWatched={watched}
                        setIsWatched={(newWatched) => {
                          setWatchedMap((prev) => ({
                            ...prev,
                            [ep.Id]:
                              typeof newWatched === "function"
                                ? newWatched(prev[ep.Id] ?? false)
                                : newWatched,
                          }));
                        }}
                      />
                      {/* Download button for episode */}
                      <button
                        type="button"
                        className="relative bg-white/10 rounded-full p-2 ml-2 border-1 border-white flex items-center justify-center cursor-pointer"
                        title="Download"
                        aria-label="Download"
                        style={{
                          lineHeight: 0,
                          width: 32,
                          height: 32,
                          transition: "background 0.2s",
                          opacity: downloadLoading ? 0.7 : 1,
                          pointerEvents: downloadLoading ? "none" : "auto",
                        }}
                        onClick={async () => {
                          if (!api || !ep.Id) return;
                          setDownloadLoadingMap((prev) => ({
                            ...prev,
                            [ep.Id]: true,
                          }));
                          try {
                            api.downloadMediaItem(ep.Id);
                          } catch {
                            alert("Failed to start download.");
                          } finally {
                            setTimeout(() => {
                              setDownloadLoadingMap((prev) => ({
                                ...prev,
                                [ep.Id]: false,
                              }));
                            }, 1000);
                          }
                        }}
                        tabIndex={0}
                      >
                        {downloadLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                      </button>
                    </span>
                  </div>
                  {/* Episode synopsis */}
                  {ep.Overview && (
                    <div className="text-gray-400 text-sm mt-1 line-clamp-3">
                      {ep.Overview}
                    </div>
                  )}
                </div>
                {/* Watched tick (desktop, right) */}
                <div className="hidden sm:flex items-center gap-2 ml-4">
                  <MarkWatchedButton
                    className="relative bg-white/10 rounded-full p-1 ml-2 border-0 flex items-center justify-center cursor-pointer"
                    style={{ width: 32, height: 32 }}
                    iconSize={16}
                    item={ep as MediaItem}
                    isWatched={watched}
                    setIsWatched={(newWatched) => {
                      setWatchedMap((prev) => ({
                        ...prev,
                        [ep.Id]:
                          typeof newWatched === "function"
                            ? newWatched(prev[ep.Id] ?? false)
                            : newWatched,
                      }));
                    }}
                  />
                  {/* Download button for episode */}
                  <button
                    type="button"
                    className="relative bg-white/10 rounded-full p-2 ml-2 border-1 border-white flex items-center justify-center cursor-pointer"
                    title="Download"
                    aria-label="Download"
                    style={{
                      lineHeight: 0,
                      width: 32,
                      height: 32,
                      transition: "background 0.2s",
                      opacity: downloadLoading ? 0.7 : 1,
                      pointerEvents: downloadLoading ? "none" : "auto",
                    }}
                    onClick={async () => {
                      if (!api || !ep.Id) return;
                      setDownloadLoadingMap((prev) => ({
                        ...prev,
                        [ep.Id]: true,
                      }));
                      try {
                        api.downloadMediaItem(ep.Id);
                      } catch {
                        alert("Failed to start download.");
                      } finally {
                        setTimeout(() => {
                          setDownloadLoadingMap((prev) => ({
                            ...prev,
                            [ep.Id]: false,
                          }));
                        }, 1000);
                      }
                    }}
                    tabIndex={0}
                  >
                    {downloadLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  } else {
    episodesListContent = (
      <div className="text-gray-400">No episodes found.</div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-4 mb-4">
        {seasonsLoading ? (
          <span className="flex-none w-[140px] h-[38px] bg-gray-800 animate-pulse rounded-md"></span>
        ) : (
          <div className="relative" ref={dropdownRef}>
            {/* Custom dropdown */}
            <button
              className="appearance-none bg-[#242424] text-white rounded px-4 py-2 pr-10 font-semibold border border-[#4d4d4d] transition-all outline-none cursor-pointer flex items-center min-w-[140px] shadow"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen((open) => !open)}
              onKeyDown={handleDropdownKeyDown}
              tabIndex={0}
            >
              {seasons.find((s) => s.Id === selectedSeasonId)?.Name ??
                "Select Season"}
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            {dropdownOpen && (
              <ul
                className="absolute z-50 mt-2 left-0 w-full bg-[#242424] border border-[#4d4d4d] rounded shadow-lg overflow-hidden animate-fade-in scrollbar-hide"
                role="listbox"
                tabIndex={-1}
                style={{
                  boxShadow: "0 2px 8px 0 rgba(0,0,0,0.15)",
                  maxHeight: "260px",
                  overflowY: "auto",
                }}
              >
                {seasons.map((season) => (
                  <li
                    key={season.Id}
                    role="option"
                    aria-selected={season.Id === selectedSeasonId}
                    className={`px-4 py-2 cursor-pointer transition-all ${
                      season.Id === selectedSeasonId
                        ? "bg-[var(--accent-secondary)] text-white"
                        : "hover:bg-[#424242] text-white"
                    } font-semibold`}
                    onClick={() => {
                      setSelectedSeasonId(season.Id);
                      setDropdownOpen(false);
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedSeasonId(season.Id);
                        setDropdownOpen(false);
                      }
                    }}
                  >
                    {season.Name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {/* Episodes List */}
      {episodesListContent}
    </div>
  );
}
