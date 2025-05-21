import clsx from "clsx";
import { Info, Play } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";

interface MediaCardProps {
  item: MediaItem;
  featured?: boolean;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, featured = false }) => {
  const { api } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  if (!api) return null;

  const hasPrimaryImage = item.ImageTags?.Primary;
  const hasBackdropImage =
    item.BackdropImageTags && item.BackdropImageTags.length > 0;

  // Identify if it's a show/episode or a movie
  const isEpisode = item.Type === "Episode";
  const isMovie = item.Type === "Movie";
  const isSeries = item.Type === "Series";
  // For episodes, get season and episode numbers
  const seasonNum = isEpisode ? item.ParentIndexNumber : undefined;
  const episodeNum = isEpisode ? item.IndexNumber : undefined;
  const showName = isEpisode ? item.SeriesName : undefined;

  let imageUrl = "";
  if (isEpisode && item.SeriesId) {
    // Use show (series) poster for episodes
    imageUrl = api.getImageUrl(item.SeriesId, "Primary", featured ? 400 : 200);
  } else if (isSeries && hasPrimaryImage) {
    // Use series poster for series
    imageUrl = api.getImageUrl(item.Id, "Primary", featured ? 400 : 200);
  } else if (hasPrimaryImage) {
    imageUrl = api.getImageUrl(item.Id, "Primary", featured ? 400 : 200);
  } else if (hasBackdropImage) {
    imageUrl = api.getImageUrl(item.Id, "Backdrop", featured ? 400 : 200);
  }

  const year = item.ProductionYear;
  const rating = item.OfficialRating;
  const title = item.Name;

  // Calculate progress percent if in progress
  let progressPercent = 0;
  if (
    item.UserData &&
    item.UserData.PlaybackPositionTicks &&
    item.RunTimeTicks &&
    item.RunTimeTicks > 0
  ) {
    progressPercent = Math.min(
      100,
      (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100
    );
  }

  return (
    <Link
      to={`/details/${item.Id}`}
      className={clsx(
        "group relative transition-all duration-300 overflow-hidden rounded-md bg-gray-900",
        featured ? "w-full aspect-[16/9]" : "w-full aspect-[2/3]",
        isHovered && "z-10 scale-110 shadow-xl"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      aria-label={`View details for ${title}`}
      style={{ display: "block" }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className={clsx(
            "w-full h-full object-cover transition-all duration-500",
            isHovered && "brightness-30"
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <span className="text-gray-400">{title}</span>
        </div>
      )}

      {/* Progress bar at the bottom */}
      {progressPercent > 0 && (
        <div className="absolute left-0 right-0 bottom-0 h-1.5 bg-black/40 z-20">
          <div
            className="h-full bg-[var(--accent-secondary)] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div
        className={clsx(
          "absolute inset-0 flex flex-col justify-end p-3 text-start",
          "bg-gradient-to-t from-black/90 to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        )}
      >
        {/*
          Extract the nested ternary operation into an independent statement.
        */}
        {(() => {
          let content;
          if (isEpisode) {
            content = (
              <>
                <span>
                  {title}
                  {seasonNum !== undefined && episodeNum !== undefined && (
                    <span className="ml-2 text-xs text-gray-300">
                      S{seasonNum}E{episodeNum}
                    </span>
                  )}
                </span>
                {showName && (
                  <div className="text-xs text-gray-400 truncate">{showName}</div>
                )}
              </>
            );
          } else if (isSeries) {
            content = <>{title}</>;
          } else {
            content = title;
          }
          return (
            <h3 className="text-white font-medium truncate">
              {content}
            </h3>
          );
        })()}

        <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
          {year && <span>{year}</span>}
          {rating && (
            <span className="border border-gray-500 px-1">{rating}</span>
          )}
          {/* Show runtime for movies and episodes */}
          {(isMovie || isEpisode) && item.RunTimeTicks && (
            <span className="bg-gray-800 px-1 rounded text-[10px] uppercase tracking-wide">
              {Math.floor(item.RunTimeTicks / 600000000)} min
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `/play/${item.Id}`;
            }}
            className="flex items-center justify-center bg-white text-black rounded-full w-8 h-8 hover:bg-red-600 hover:text-white transition-colors"
            tabIndex={-1}
            aria-label={`Play ${title}`}
          >
            <Play size={16} className="ml-0.5" />
          </button>

          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `/details/${item.Id}`;
            }}
            className="flex items-center justify-center bg-gray-700 text-white rounded-full w-8 h-8 hover:bg-white hover:text-black transition-colors"
            tabIndex={-1}
            aria-label={`More info about ${title}`}
          >
            <Info size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default MediaCard;
