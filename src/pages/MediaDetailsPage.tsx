import { Calendar, Clock, Play, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import rottenTomatoesIcon from "../assets/png/rotten.png";
import Navbar from "../components/layout/Navbar";
import EpisodesList from "../components/ui/EpisodesList";
import CastList from "../components/ui/CastList";
import { useAuth } from "../context/AuthContext";
import { useMediaItem } from "../hooks/useMediaData";
import { MediaItem, People, Studios } from "../types/jellyfin";

const MediaDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  // Always call hooks at the top level, before any early returns or conditionals
  const { itemId } = useParams<{ itemId: string }>();
  const { item, isLoading, error } = useMediaItem(itemId);
  const { api } = useAuth();
  const [seasons, setSeasons] = useState<MediaItem[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [seriesNextUp, setSeriesNextUp] = useState<MediaItem[]>([]);
  const [seriesNextUpLoading, setSeriesNextUpLoading] = useState(false);
  const [episodes, setEpisodes] = useState<MediaItem[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesTransitionKey, setEpisodesTransitionKey] = useState(0);

  // Only use item after all hooks
  const isSeries = item?.Type === "Series";
  const isEpisode = item?.Type === "Episode";

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
      setSeriesNextUp([]);
      setSeriesNextUpLoading(false);
      return;
    }
    setSeriesNextUpLoading(true);
    api
      .getSeriesNextUp(item.Id, 6)
      .then((items) => setSeriesNextUp(items || []))
      .catch(() => setSeriesNextUp([]))
      .finally(() => setSeriesNextUpLoading(false));
  }, [isSeries, api, item?.Id]);

  // Fetch episodes for selected season (for Series, Season, or Episode)
  useEffect(() => {
    let seriesId: string | undefined;
    let seasonId: string | undefined;

    if (isSeries && selectedSeasonId && api && item?.Id) {
      seriesId = item.Id;
      seasonId = selectedSeasonId;
    } else if (item?.Type === "Season" && api && item.Id && item.SeriesId) {
      seriesId = item.SeriesId;
      seasonId = item.Id;
    } else if (isEpisode && api && item?.SeriesId && selectedSeasonId) {
      seriesId = item.SeriesId;
      seasonId = selectedSeasonId;
    }

    if (seriesId && seasonId) {
      setEpisodesLoading(true);
      api
        .getEpisodes(seriesId, seasonId)
        .then((eps) => setEpisodes(eps || []))
        .catch(() => setEpisodes([]))
        .finally(() => setEpisodesLoading(false));
    } else {
      setEpisodes([]);
      setEpisodesLoading(false);
    }
  }, [
    isSeries,
    isEpisode,
    selectedSeasonId,
    item?.Type,
    item?.Id,
    item?.SeriesId,
    api,
  ]);

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
    setEpisodesTransitionKey((k) => k + 1);
  };

  const isSeasonEpisodeList = (episodes: MediaItem[]) => {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Episodes</h2>
        {episodesLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
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
        ) : (
          // Add transition wrapper here
          <div
            key={episodesTransitionKey}
            className="transition-all duration-500 ease-in-out animate-fadein"
            style={{
              animation: "fadein 0.5s",
            }}
          >
            <EpisodesList episodes={episodes} />
          </div>
        )}
      </div>
    );
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
                    item.People.filter(
                      (p: { Type: string; Name: string }) =>
                        p.Type === "Director"
                    ).length > 0 && (
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
                {isSeries && (
                  <div className="mt-10 space-y-8">
                    {/* Next Up Episode */}
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Next Up</h2>
                      {seriesNextUpLoading ? (
                        <div className="flex gap-4">
                          {Array.from({ length: 1 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-32 h-20 bg-gray-800 animate-pulse rounded-md"
                            ></div>
                          ))}
                        </div>
                      ) : seriesNextUp.length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                          {seriesNextUp.map((ep) => (
                            <button
                              key={ep.Id}
                              onClick={() => navigate(`/play/${ep.Id}`)}
                              className="group flex flex-col items-center w-48 cursor-pointer focus:outline-none"
                              style={{
                                border: "none",
                                background: "none",
                                padding: 0,
                              }}
                              tabIndex={0}
                              title={ep.Name}
                            >
                              <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden bg-gray-900 hover:scale-105 hover:shadow-lg transition-all">
                                {ep.ImageTags?.Primary ? (
                                  <img
                                    src={api.getImageUrl(ep.Id, "Primary", 320)}
                                    alt={ep.Name}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800">
                                    <span className="text-gray-400">
                                      {ep.Name}
                                    </span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
                              </div>
                              <div className="mt-1 text-center w-full">
                                <div className="text-xs font-semibold text-white truncate">
                                  {ep.Name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {ep.ParentIndexNumber !== undefined &&
                                    ep.IndexNumber !== undefined && (
                                      <>
                                        S{ep.ParentIndexNumber}E{ep.IndexNumber}
                                      </>
                                    )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400">No episodes found.</div>
                      )}
                    </div>
                    {/* Seasons Dropdown and Episodes */}
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        {/* <h2 className="text-xl font-semibold">Season</h2> */}
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
                      {/* Episodes List */}
                      {episodesLoading ? (
                        <div className="flex flex-col gap-4">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
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
                      ) : episodes.length > 0 ? (
                        <EpisodesList episodes={episodes} />
                      ) : (
                        <div className="text-gray-400">No episodes found.</div>
                      )}
                    </div>
                  </div>
                )}
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
                    {/* Episodes List */}
                    {episodesLoading ? (
                      <div className="flex flex-col gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
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
                    ) : episodes.length > 0 ? (
                      <EpisodesList episodes={episodes} />
                    ) : (
                      <div className="text-gray-400">No episodes found.</div>
                    )}
                  </div>
                )}
                {/* --- End episode list for Season --- */}

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
