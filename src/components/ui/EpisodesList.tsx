import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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
  // Optionally allow initial season selection
  initialSeasonId?: string;
}

export default function EpisodesList({
  seriesId,
  initialSeasonId,
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
  }, [api, seriesId]);

  // Fetch episodes for selected season
  useEffect(() => {
    if (!api || !seriesId || !selectedSeasonId) {
      setEpisodes([]);
      setEpisodesLoading(false);
      return;
    }
    setEpisodesLoading(true);
    api
      .getEpisodes(seriesId, selectedSeasonId)
      .then((eps: Episode[]) => setEpisodes(eps || []))
      .catch(() => setEpisodes([]))
      .finally(() => setEpisodesLoading(false));
  }, [api, seriesId, selectedSeasonId]);

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeasonId(e.target.value);
  };

  // Extract episodes list rendering logic into a variable
  let episodesListContent: JSX.Element;
  if (episodesLoading) {
    episodesListContent = (
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
    );
  } else if (episodes.length > 0) {
    episodesListContent = (
      <div className="divide-y divide-[#232323] border border-[#232323] rounded-xl overflow-hidden mb-10">
        {episodes.map((ep, idx) => {
          // Calculate runtime in m format
          let runtime = "";
          if (ep.RunTimeTicks) {
            const totalMinutes = Math.floor(
              ep.RunTimeTicks / (10000 * 1000 * 60)
            );
            runtime = `${totalMinutes}m`;
          }
          const watched = ep.UserData?.Played;

          return (
            <div
              key={ep.Id}
              className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center group hover:bg-[#232323] transition px-2 py-4 sm:px-4 sm:py-3"
            >
              {/* Thumbnail and play overlay */}
              <div className="relative w-full sm:w-40 h-24 sm:h-20 flex-shrink-0 rounded overflow-hidden group cursor-pointer mb-2 sm:mb-0">
                <img
                  src={
                    ep.ImageTags?.Primary && api
                      ? api.getImageUrlProps({itemId: ep.Id, imageType: "Primary", maxWidth: 400})
                      : ""
                  }
                  alt={ep.Name}
                  className="w-full h-full object-cover"
                  onClick={() => navigate(`/play/${ep.Id}`)}
                  style={{ cursor: "pointer" }}
                />
                {/* Play overlay */}
                <button
                  onClick={() => navigate(`/play/${ep.Id}`)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
                  tabIndex={-1}
                  aria-label={`Play ${ep.Name}`}
                >
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="20" fill="rgba(0,0,0,0.5)" />
                    <polygon points="16,13 30,20 16,27" fill="#fff" />
                  </svg>
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
                  <span className="ml-auto sm:hidden">
                    {watched && (
                      <span className="text-red-500" title="Watched">
                        <svg
                          width="22"
                          height="22"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    )}
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
              <div className="hidden sm:flex flex-col gap-2 ml-4">
                {watched && (
                  <span className="text-red-500" title="Watched">
                    <svg
                      width="22"
                      height="22"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    episodesListContent = (
      <div className="text-gray-400">No episodes found.</div>
    );
  }

  return (
    <div className="mt-8">
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
          </div>
        )}
      </div>
      {/* Episodes List */}
      {episodesListContent}
    </div>
  );
}
