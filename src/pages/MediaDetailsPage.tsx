import { Calendar, Clock, Play, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import rottenTomatoesIcon from "../assets/png/rotten.png";
import Navbar from "../components/layout/Navbar";
import CastList from "../components/ui/CastList";
import EpisodesList from "../components/ui/EpisodesList";
import { useAuth } from "../context/AuthContext";
import { useMediaItem } from "../hooks/useMediaData";
import { MediaItem, People, Studios } from "../types/jellyfin";
import { typeEpisode, typeSeries } from "../utils/items";

const MediaDetailsPage: React.FC = () => {
  // Always call hooks at the top level, before any early returns or conditionals
  const { itemId } = useParams<{ itemId: string }>();
  const { item, isLoading, error } = useMediaItem(itemId);
  const { api } = useAuth();
  const [seasons, setSeasons] = useState<MediaItem[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Only use item after all hooks
  const isSeries = typeSeries(item);
  const isEpisode = typeEpisode(item);

  useEffect(() => {
    // Reset image loaded state when item changes
    setIsImageLoaded(false);
  }, [itemId]);

  useEffect(() => {
    // For isEpisode, fetch seasons for the parent series
    if (isEpisode && api && item?.SeriesId) {
      setSeasonsLoading(true);
      api
        .getSeasons(item.SeriesId)
        .then((items) => {
          setSeasons(items);
          // Select the season that matches the episode's ParentId
          if (items && items.length > 0) {
            const found = items.find((s) => s.Id === item.ParentId);
            setSelectedSeasonId(found?.Id ?? items[0].Id);
          }
        })
        .catch(() => {
          setSeasons([]);
          setSelectedSeasonId(null);
        })
        .finally(() => setSeasonsLoading(false));
      return;
    }
    // ...existing code for isSeries...
    if (!isSeries || !api || !item?.Id) {
      setSeasons([]);
      setSeasonsLoading(false);
      setSelectedSeasonId(null);
      return;
    }
    setSeasonsLoading(true);
    api
      .getSeasons(item.Id)
      .then((items) => {
        setSeasons(items);
        // Select latest season by default
        if (items && items.length > 0) {
          // Sort by IndexNumber descending, fallback to last in array
          const sorted = [...items].sort(
            (a, b) => (b.IndexNumber ?? 0) - (a.IndexNumber ?? 0)
          );
          setSelectedSeasonId(sorted[0]?.Id ?? items[items.length - 1].Id);
        }
      })
      .catch(() => {
        setSeasons([]);
        setSelectedSeasonId(null);
      })
      .finally(() => setSeasonsLoading(false));
  }, [isSeries, isEpisode, api, item?.Id, item?.SeriesId, item?.ParentId]);

  // Fetch next up for this series using getSeriesNextUp
  useEffect(() => {
    if (!isSeries || !api || !item?.Id) {
      return;
    }
  }, [isSeries, api, item?.Id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error || !item || !api) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <Navbar />
        <div className="pt-16 container mx-auto px-4 py-12">
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p>Failed to load media details. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasBackdropImage = isEpisode
    ? item.ParentBackdropImageTags && item.ParentBackdropImageTags.length > 0
    : item.BackdropImageTags && item.BackdropImageTags.length > 0;
  const hasPrimaryImage = item.ImageTags?.Primary;
  const hasLogoImage = item.ImageTags?.Logo;

  let backdropUrl = "";
  let posterUrl = "";
  let logoUrl = "";

  if (hasBackdropImage) {
    const itemId = isEpisode ? item.SeriesId : item.Id;
    backdropUrl = api.getImageUrl(itemId ?? "", "Backdrop", 1920);
  }

  if (hasPrimaryImage) {
    posterUrl = api.getImageUrl(item.Id, "Primary", 400);
  }

  if (hasLogoImage) {
    logoUrl = api.getImageUrl(item.Id, "Logo", 400);
  }

  // Format runtime from ticks to minutes
  const formatRuntime = (ticks?: number) => {
    if (!ticks) return "";

    const totalMinutes = Math.floor(ticks / (10000 * 1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Add a handler to update the transition key when season changes
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeasonId(e.target.value);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />
      {/* Hero Section with Backdrop */}
      <div className="relative w-full min-h-[80vh]">
        {/* Backdrop Image */}
        {backdropUrl && (
          <>
            <img
              src={backdropUrl}
              alt={item.Name}
              onLoad={() => setIsImageLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
                isImageLoaded ? "opacity-30" : "opacity-0"
              }`}
              style={{ zIndex: 0 }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/70 to-neutral-900/30"
              style={{ zIndex: 1 }}
            ></div>
            <div
              className="absolute inset-0 bg-gradient-to-r from-neutral-900 to-transparent"
              style={{ zIndex: 2 }}
            ></div>
          </>
        )}

        {/* Content */}
        <div className="relative z-10">
          <div className="container mx-auto px-4 pt-24 md:pt-28">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Poster */}
              <div className="md:flex-shrink-0">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={item.Name}
                    className="w-full md:w-64 lg:w-72 rounded-md shadow-lg"
                  />
                ) : (
                  <div className="w-full md:w-64 lg:w-72 aspect-[2/3] bg-gray-800 rounded-md flex items-center justify-center">
                    <span className="text-gray-500">{item.Name}</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-4 mb-12">
                <div>
                  {isEpisode ? (
                    <>
                      <div className="text-3xl md:text-4xl lg:text-5xl font-bold m-0">
                        <Link
                          to={`/details/${item.SeriesId}`}
                          className="text-white hover:underline"
                        >
                          {item.SeriesName}
                        </Link>
                      </div>
                      <div className="text-base font-semibold text-white mt-1">
                        {item.ParentIndexNumber !== undefined &&
                        item.IndexNumber !== undefined ? (
                          <>
                            Season {item.ParentIndexNumber} - {item.IndexNumber}
                            . {item.Name}
                          </>
                        ) : (
                          item.Name
                        )}
                      </div>
                    </>
                  ) : (
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold m-0">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={item.Name}
                          className="max-h-20 md:max-h-28 lg:max-h-32 w-auto object-contain"
                          style={{ display: "inline-block" }}
                        />
                      ) : (
                        item.Name
                      )}
                    </h1>
                  )}
                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 mt-6 mb-2">
                    <Link
                      to={`/play/${item.Id}`}
                      className="flex items-center gap-1 px-6 py-2 bg-white text-black rounded font-medium hover:bg-red-600 hover:text-white transition-colors text-[14px]"
                    >
                      <Play size={14} className="ml-0" />
                      <span>Play</span>
                    </Link>
                  </div>
                </div>

                {isEpisode && (
                  <div className="flex items-center gap-4 text-sm text-gray-300 mt-1">
                    {/* Date */}
                    {item.PremiereDate && (
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>
                          {new Date(item.PremiereDate).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "numeric",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    )}
                    {/* Runtime */}
                    {item.RunTimeTicks && (
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>
                          {Math.round(item.RunTimeTicks / 600000000)}m
                        </span>
                      </div>
                    )}
                    {/* Rating */}
                    {item.CommunityRating && (
                      <span className="flex items-center gap-1">
                        <Star
                          size={16}
                          className="text-yellow-500 fill-yellow-500"
                        />
                        {item.CommunityRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                )}
                {!isEpisode && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                    {item.ProductionYear && (
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{item.ProductionYear}</span>
                      </div>
                    )}

                    {item.RunTimeTicks && (
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{formatRuntime(item.RunTimeTicks)}</span>
                      </div>
                    )}

                    {item.OfficialRating && (
                      <span className="px-1.5 py-0.5 bg-gray-800 text-gray-300 text-xs rounded">
                        {item.OfficialRating}
                      </span>
                    )}

                    {item.CommunityRating && (
                      <div className="flex items-center gap-1">
                        <Star
                          size={16}
                          className="text-yellow-500 fill-yellow-500"
                        />
                        <span>{item.CommunityRating.toFixed(1)}</span>
                      </div>
                    )}

                    {item.CriticRating && (
                      <div className="flex items-center gap-1">
                        <img
                          className="w-4 h-4"
                          src={rottenTomatoesIcon}
                          alt="rotten"
                        />
                        <span>{item.CriticRating}%</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Genres */}
                {item.Genres && item.Genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.Genres.map((genre, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overview */}
                <p className="text-gray-300 max-w-3xl">
                  {item.Overview ?? "No overview available."}
                </p>

                {/* --- Additional Info Section --- */}
                <div className="flex flex-col flex-wrap gap-4 text-gray-300 text-sm mb-2">
                  {/* Director */}
                  {Array.isArray(item.People) &&
                    item.People.filter((p) => p.Type === "Director").length >
                      0 && (
                      <div>
                        <span className="font-semibold text-white">
                          Director:
                        </span>{" "}
                        {item.People.filter(
                          (p: People) => p.Type === "Director"
                        )
                          .map((p: People) => p.Name)
                          .join(", ")}
                      </div>
                    )}
                  {/* Writers */}
                  {Array.isArray(item.People) &&
                    item.People.filter((p: People) => p.Type === "Writer")
                      .length > 0 && (
                      <div>
                        <span className="font-semibold text-white">
                          Writers:
                        </span>{" "}
                        {item.People.filter((p: People) => p.Type === "Writer")
                          .map((p: People) => p.Name)
                          .join(", ")}
                      </div>
                    )}
                  {/* Studios */}
                  {item.Studios && item.Studios.length > 0 && (
                    <div>
                      <span className="font-semibold text-white">Studios:</span>{" "}
                      {item.Studios.map((s: Studios) => s.Name).join(", ")}
                    </div>
                  )}
                </div>
                {/* --- End Additional Info Section --- */}
                <br />

                {/* --- Next Up and Seasons for Series --- */}

                {/* --- End Next Up and Seasons --- */}

                {/* --- Show episode list for Season --- */}
                {(item.Type === "Season" || isEpisode) && (
                  <div className="mt-10 space-y-8">
                    {/* Season Dropdown */}
                    <div className="flex items-center gap-4 mb-4">
                      {seasonsLoading ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : (
                        <div className="relative">
                          <select
                            className="appearance-none bg-gray-800 text-white rounded px-4 py-2 pr-10 font-semibold border border-gray-700 focus:ring-2 focus:ring-red-600 transition-all outline-none cursor-pointer"
                            value={selectedSeasonId ?? ""}
                            onChange={handleSeasonChange}
                            style={{
                              minWidth: "140px",
                              boxShadow: "0 2px 8px 0 rgba(0,0,0,0.15)",
                            }}
                          >
                            {seasons.map((season) => (
                              <option key={season.Id} value={season.Id}>
                                {season.Name}
                              </option>
                            ))}
                          </select>
                          {/* Chevron icon */}
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg
                              width="18"
                              height="18"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M6 9l6 6 6-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Episodes List */}
                <EpisodesList seriesId={item.Id} />

                {/* Cast Info */}
                {item.People && item.People.length > 0 && (
                  <CastList people={item.People} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailsPage;

// Add fadein animation to global styles if not present
// You can add this to your global CSS (e.g., index.css or tailwind.css):
// @keyframes fadein { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: none;} }
// .animate-fadein { animation: fadein 0.5s; }
