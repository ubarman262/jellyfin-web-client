import React, { useState, useEffect, useRef } from "react";
import { MediaItem } from "../../types/jellyfin";
import { useAuth } from "../../context/AuthContext";
import { Play, Info } from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";

interface HeroBannerProps {
  item: MediaItem;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ item }) => {
  const { api } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState<string>("");
  const [firstEpisodeId, setFirstEpisodeId] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setIsLoaded(false);
    if (!api || !item) {
      setBackdropUrl("");
      return;
    }
    if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {
      const url = api.getImageUrl(item.Id, "Backdrop", 1920);
      setBackdropUrl(url);

      // Preload image reliably
      const img = new window.Image();
      img.src = url;
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setIsLoaded(true);
    } else {
      setBackdropUrl("");
      setIsLoaded(true);
    }
  }, [api, item]);

  // Fetch first episode id for series
  useEffect(() => {
    if (!api || !item || item.Type !== "Series") {
      setFirstEpisodeId(null);
      return;
    }
    let cancelled = false;
    api.getSeasons(item.Id).then((seasons) => {
      if (cancelled) return;
      const season1 =
        seasons.find(
          (s: any) =>
            s.IndexNumber === 1 || s.SeasonNumber === 1 || s.Name === "Season 1"
        ) ?? seasons[0];
      if (season1?.Id) {
        api
          .getEpisodes(item.Id, season1.Id)
          .then((episodes) => {
            if (cancelled) return;
            const ep1 =
              episodes.find(
                (e: any) =>
                  e.IndexNumber === 1 ||
                  e.EpisodeNumber === 1 ||
                  e.Name === "Episode 1"
              ) || episodes[0];
            setFirstEpisodeId(ep1?.Id || null);
          })
          .catch(() => setFirstEpisodeId(null));
      } else {
        setFirstEpisodeId(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api, item]);

  if (!api || !item) return null;

  const title = item.Name;
  const overview = item.Overview;
  const year = item.ProductionYear;
  const genres = item.Genres || [];

  return (
    <div className="relative w-full h-[70vh] overflow-hidden">
      {/* Backdrop Image */}
      {backdropUrl ? (
        <>
          <img
            ref={imgRef}
            src={backdropUrl}
            alt={item.Name}
            className={clsx(
              "absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            draggable={false}
          />
          <div
            className={clsx(
              "absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-neutral-900/20",
              "transition-opacity duration-1000",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            className={clsx(
              "absolute inset-0 bg-gradient-to-r from-neutral-900 to-transparent",
              "transition-opacity duration-1000",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-neutral-900"></div>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex items-end md:items-center p-8">
        <div className="container mx-auto">
          <div className="max-w-2xl space-y-4">
            <h1
              className={clsx(
                "text-4xl md:text-6xl font-bold text-white transition-transform duration-700",
                isLoaded
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              )}
            >
              {title}
            </h1>

            <div
              className={clsx(
                "flex items-center gap-3 text-sm text-gray-300 transition-transform duration-700 delay-100",
                isLoaded
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              )}
            >
              {year && <span>{year}</span>}
              {genres.length > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                  <span>{genres.slice(0, 3).join(", ")}</span>
                </>
              )}
            </div>

            <p
              className={clsx(
                "text-gray-300 line-clamp-3 md:line-clamp-4 transition-transform duration-700 delay-200",
                isLoaded
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              )}
            >
              {overview}
            </p>

            <div
              className={clsx(
                "flex items-center gap-4 transition-transform duration-700 delay-300",
                isLoaded
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              )}
            >
              <Link
                to={
                  item.Type === "Series"
                    ? firstEpisodeId
                      ? `/play/${firstEpisodeId}`
                      : `/play/${item.Id}?season=1&episode=1`
                    : `/play/${item.Id}`
                }
                className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded font-medium hover:bg-red-600 hover:text-white transition-colors"
              >
                <Play size={20} className="ml-0" />
                <span>Play</span>
              </Link>

              <Link
                to={`/details/${item.Id}`}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700/80 text-white rounded font-medium hover:bg-gray-600 transition-colors"
              >
                <Info size={20} />
                <span>More Info</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
