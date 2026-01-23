import { Calendar, Clock, Star } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import rottenTomatoesIcon from "../../../assets/png/rotten.png";
import { MediaItem } from "../../../types/jellyfin";
import { formatRuntime } from "../../../utils/formatters";
import { getDirectors, getStudios, getWriters } from "../../../utils/items";

interface MediaDetailsHeaderProps {
  item: MediaItem;
  isEpisode: boolean;
  hasBackdropImage: boolean | undefined;
  hasPrimaryImage: string | undefined;
  hasLogoImage: string | undefined;
  backdropUrl: string;
  posterUrl: string;
  logoUrl: string;
  isImageLoaded: boolean;
  onImageLoad: () => void;
}

const MediaDetailsHeader: React.FC<MediaDetailsHeaderProps> = ({
  item,
  isEpisode,
  hasBackdropImage,
  hasPrimaryImage,
  hasLogoImage,
  backdropUrl,
  posterUrl,
  logoUrl,
  isImageLoaded,
  onImageLoad
}) => {
  const directors = getDirectors(item ?? []);
  const writers = getWriters(item ?? []);
  const studios = getStudios(item ?? []);

  return (
    <div className="relative">
      {/* Backdrop */}
      {hasBackdropImage && (
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/70 to-neutral-900/20" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 pt-24 pb-12 px-14">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          {hasPrimaryImage && (
            <div className="flex-shrink-0">
              <img
                src={posterUrl}
                alt={item.Name ?? ""}
                className={`w-64 h-96 object-cover rounded-lg shadow-2xl transition-opacity duration-500 ${
                  isImageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={onImageLoad}
              />
            </div>
          )}

          {/* Details */}
          <div className="flex-1 space-y-6">
            {/* Title and Logo */}
            <div>
              {hasLogoImage ? (
                <img
                  src={logoUrl}
                  alt={item.Name ?? ""}
                  className="h-16 md:h-20 object-contain mb-4"
                />
              ) : (
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                  {item.Name}
                </h1>
              )}

              {isEpisode && (
                <div className="text-xl text-gray-300 mb-2">
                  S{item.ParentIndexNumber}:E{item.IndexNumber} - {item.Name}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
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

              {item.CommunityRating && (
                <div className="flex items-center gap-1">
                  <Star size={16} className="text-yellow-500 fill-current" />
                  <span>{item.CommunityRating.toFixed(1)}</span>
                </div>
              )}

              {item.CriticRating && (
                <div className="flex items-center gap-1">
                  <img src={rottenTomatoesIcon} alt="RT" className="w-4 h-4" />
                  <span>{item.CriticRating}%</span>
                </div>
              )}

              {item.OfficialRating && (
                <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                  {item.OfficialRating}
                </span>
              )}
            </div>

            {/* Genres */}
            {item.Genres && item.Genres.length > 0 && (
              <div>
                <span className="text-gray-400">Genres: </span>
                <span className="text-white">{item.Genres.slice(0, 3).join(", ")}</span>
              </div>
            )}

            {/* Overview */}
            {item.Overview && (
              <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-3xl">
                {item.Overview}
              </p>
            )}

            {/* Credits */}
            <div className="space-y-2 text-sm">
              {directors.length > 0 && (
                <div>
                  <span className="text-gray-400">Director{directors.length > 1 ? 's' : ''}: </span>
                  <span className="text-white">
                    {directors.map((d) => d).join(", ")}
                  </span>
                </div>
              )}

              {writers.length > 0 && (
                <div>
                  <span className="text-gray-400">Writer{writers.length > 1 ? 's' : ''}: </span>
                  <span className="text-white">
                    {writers.map((w) => w).join(", ")}
                  </span>
                </div>
              )}

              {studios.length > 0 && (
                <div>
                  <span className="text-gray-400">Studio{studios.length > 1 ? 's' : ''}: </span>
                  <span className="text-white">
                    {studios.map((s, index) => (
                      <Link
                        key={s}
                        to={`/studio?studioId=${s}&studioName=${encodeURIComponent(s ?? "")}`}
                        className="hover:text-red-400 transition-colors"
                      >
                        {s}
                        {index < studios.length - 1 ? ", " : ""}
                      </Link>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailsHeader;