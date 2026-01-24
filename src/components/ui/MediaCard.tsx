import clsx from "clsx";
import { Info, Play } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import JellyfinApi from "../../api/jellyfin";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";
import { useSetRecoilState } from "recoil";
import isDrawerOpen from "../../states/atoms/DrawerOpen";
import activeItem from "../../states/atoms/ActiveItem";

interface MediaCardProps {
  item: MediaItem;
  featured?: boolean;
  onSelectItem?: (itemId: string) => void;
  isHorizontal?: boolean;
}

function getImageUrl(
  api: JellyfinApi | null,
  item: MediaItem,
  featured: boolean,
  isHorizontal?: boolean,
) {
  if (!api) return "";

  const size = featured ? 400 : 200;
  const hasPrimaryImage = !!item.ImageTags?.Primary;
  const hasBackdropImage = !!(
    item.BackdropImageTags && item.BackdropImageTags.length > 0
  );
  const hasThumbImage = !!item.ImageTags?.Thumb;

  switch (item.Type) {
    case "Episode":
      if (isHorizontal && item.SeriesId) {
        return api.getImageUrl(item.SeriesId, "Thumb", size);
      } else if (item.SeriesId) {
        return api.getImageUrl(item.SeriesId, "Primary", size);
      }
      break;
    case "Series":
      if (hasPrimaryImage) {
        return api.getImageUrl(item.Id, "Primary", size);
      }
      break;
    case "EpisodeInSearch":
      if (hasPrimaryImage) {
        return api.getImageUrl(item.Id, "Primary", size);
      } else if (item.SeriesId) {
        return api.getImageUrl(item.SeriesId, "Primary", size);
      }
      break;
    case "Movie":
      if (isHorizontal) {
        if (hasThumbImage) {
          return api.getImageUrl(item.Id, "Thumb", size);
        } else if (hasBackdropImage) {
          return api.getImageUrl(item.Id, "Backdrop", size);
        }
      } else if (hasPrimaryImage) {
        return api.getImageUrl(item.Id, "Primary", size);
      } else if (hasBackdropImage) {
        return api.getImageUrl(item.Id, "Backdrop", size);
      }
      break;
    default:
      if (hasPrimaryImage) {
        return api.getImageUrl(item.Id, "Primary", size);
      }
      if (hasBackdropImage) {
        return api.getImageUrl(item.Id, "Backdrop", size);
      }
      break;
  }
  return "";
}

function getProgressPercent(item: MediaItem) {
  if (
    item.UserData?.PlaybackPositionTicks &&
    item.RunTimeTicks &&
    item.RunTimeTicks > 0
  ) {
    return Math.min(
      100,
      (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100,
    );
  }
  return 0;
}

interface CardContentProps {
  item: MediaItem;
  isEpisode: boolean;
  isMovie: boolean;
  isSeries: boolean;
  nextUoId?: string;
  seasonNum?: number;
  episodeNum?: number;
  showName?: string;
  year?: number;
  rating?: string;
  title: string;
  navigate: ReturnType<typeof useNavigate>;
  onCardClick: React.Dispatch<React.SetStateAction<string>>;
  // Add these for BoxSet support
  isBoxSet?: boolean;
  boxSetFirstMovieId?: string;
}

const CardContent: React.FC<CardContentProps & { touchDevice?: boolean }> = ({
  item,
  isEpisode,
  isMovie,
  isSeries,
  seasonNum,
  episodeNum,
  showName,
  year,
  rating,
  title,
  nextUoId,
  navigate,
  onCardClick,
  isBoxSet,
  boxSetFirstMovieId,
  touchDevice,
}) => {
  const location = useLocation();

  let titleContent;
  if (isEpisode) {
    titleContent = (
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
  } else {
    titleContent = title;
  }

  // Use first movie in BoxSet if present
  let playbackId: string | undefined;
  if (isBoxSet && boxSetFirstMovieId) {
    playbackId = boxSetFirstMovieId;
  } else if (isSeries) {
    playbackId = nextUoId;
  } else {
    playbackId = item.Id;
  }

  return (
    <>
      <h3 className="text-white font-medium truncate">{titleContent}</h3>
      {!touchDevice && (
        <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
          {year && <span>{year}</span>}
          {rating && (
            <span className="border border-gray-500 px-1">{rating}</span>
          )}
          {(isMovie || isEpisode) && item.RunTimeTicks && (
            <span className="bg-gray-800 px-1 rounded text-[10px] uppercase tracking-wide">
              {Math.floor(item.RunTimeTicks / 600000000)} min
            </span>
          )}
        </div>
      )}
      {!touchDevice && (
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const firstSegment = location.pathname.split("/")[1];
              navigate(`/play/${playbackId}`, {
                state: { callbackPath: `/${firstSegment}` },
              });
            }}
            className="flex items-center justify-center bg-white text-black rounded-full w-8 h-8 hover:bg-red-600 hover:text-white transition-colors"
            tabIndex={-1}
            aria-label={`Play ${title}`}
          >
            <Play size={16} className="ml-0.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCardClick(item.Id);
            }}
            className="flex items-center justify-center bg-gray-700 text-white rounded-full w-8 h-8 hover:bg-white hover:text-black transition-colors"
            tabIndex={-1}
            aria-label={`More info about ${title}`}
          >
            <Info size={16} />
          </button>
        </div>
      )}
    </>
  );
};

const MediaCard: React.FC<MediaCardProps> = ({
  item,
  featured = false,
  onSelectItem,
  isHorizontal = false,
}) => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  // Track if device is touch
  const [touchDevice, setTouchDevice] = useState(false);

  const [targetId, setTargetId] = useState<string>(item.Id);
  // BoxSet state
  const [boxSetFirstMovieId, setBoxSetFirstMovieId] = useState<
    string | undefined
  >(undefined);
  const isBoxSet = item.Type === "BoxSet";
  const isEpisode = item.Type === "Episode";
  const isMovie = item.Type === "Movie";
  const isSeries = item.Type === "Series";
  const seasonNum = isEpisode ? item.ParentIndexNumber : undefined;
  const episodeNum = isEpisode ? item.IndexNumber : undefined;
  const showName = isEpisode ? item.SeriesName : undefined;
  const imageUrl = getImageUrl(api, item, featured, isHorizontal);
  const year = item.ProductionYear;
  const rating = item.OfficialRating;
  const title = item.Name;
  const progressPercent = getProgressPercent(item);

  const setIsDrawerOpen = useSetRecoilState(isDrawerOpen);
  const setActiveTiemId = useSetRecoilState(activeItem);

  useEffect(() => {
    async function resolveTargetId() {
      if (!isSeries) {
        return;
      }

      // 1. Try NextUp
      if (api) {
        const nextUp = await api.getSeriesNextUp(item.Id, 1);
        if (Array.isArray(nextUp) && nextUp.length > 0) {
          setTargetId(nextUp[0].Id);
          return;
        }
      }

      // fallback to series id
      setTargetId(item.Id);
    }

    resolveTargetId();
  }, [isSeries, api, item]);

  // Fetch first movie in BoxSet if item is a BoxSet
  useEffect(() => {
    let cancelled = false;
    async function fetchBoxSetFirstMovie() {
      if (!api || !isBoxSet) {
        setBoxSetFirstMovieId(undefined);
        return;
      }
      try {
        const movies = await api.getBoxSetMovies(item.Id);
        if (!cancelled && movies && movies.length > 0) {
          setBoxSetFirstMovieId(movies[0].Id);
        } else if (!cancelled) {
          setBoxSetFirstMovieId(undefined);
        }
      } catch {
        if (!cancelled) setBoxSetFirstMovieId(undefined);
      }
    }
    fetchBoxSetFirstMovie();
    return () => {
      cancelled = true;
    };
  }, [api, isBoxSet, item]);

  const handleCardClick = (id: string) => {
    if (onSelectItem) {
      onSelectItem(id);
    } else {
      setActiveTiemId(id);
      setIsDrawerOpen(true);
    }
  };

  useEffect(() => {
    setTouchDevice(isTouchDevice());
  }, []);

  // Determine aspect ratio and layout classes
  let aspectClasses: string;
  if (featured) {
    aspectClasses = "w-full aspect-[16/9]";
  } else if (isHorizontal) {
    aspectClasses =
      "aspect-[16/7] min-h-[150px] max-h-[160px] flex-row flex border border-white/20";
  } else {
    aspectClasses = "w-full aspect-[2/3] z-10";
  }

  return (
    <div>
      <div
        className={clsx(
          "group relative transition-all duration-300 overflow-hidden bg-gray-900 cursor-pointer rounded-md",
          aspectClasses,
          // isHovered && "z-10 shadow-xl",
          isHovered && "scale-[1.03] shadow-xl",

          isHorizontal ? "w-[300px]" : "max-w-[200px] max-h-[300px]",
        )}
        onMouseEnter={() => {
          if (!touchDevice) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (!touchDevice) setIsHovered(false);
        }}
        tabIndex={0}
        aria-label={`View details for ${title}`}
        style={{ display: "block" }}
        onClick={() => handleCardClick(item.Id)}
        role="button"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className={clsx(
              isHorizontal
                ? "object-cover h-full min-w-[300px] rounded-l-md"
                : "w-full h-full object-cover rounded-md",
              isHorizontal ? "" : "max-w-[200px] max-h-[300px]",
            )}
          />
        ) : (
          <div
            className={clsx(
              isHorizontal
                ? "flex items-center justify-center bg-gray-800 rounded-l-md h-full min-w-[200px]"
                : "w-full h-full flex items-center justify-center bg-gray-800 rounded-md max-w-[200px] max-h-[300px]",
            )}
          >
            <span className="text-gray-400">{title}</span>
          </div>
        )}

        {progressPercent > 0 && !isHorizontal && (
          <div className="absolute left-0 right-0 bottom-0 h-1.5 bg-black/40 z-10">
            <div
              className="h-full bg-[var(--accent-secondary)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <div
          className={clsx(
            isHorizontal
              ? "flex-1 flex flex-col justify-center px-4 py-2"
              : "absolute inset-0 flex flex-col justify-end p-3 text-start",
            isHorizontal ? "" : "bg-gradient-to-t from-black/90 to-transparent",
            touchDevice
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          )}
        >
          <CardContent
            item={item}
            isEpisode={isEpisode}
            isMovie={isMovie}
            isSeries={isSeries}
            nextUoId={targetId}
            seasonNum={seasonNum}
            episodeNum={episodeNum}
            showName={showName}
            year={year}
            rating={rating}
            title={title}
            navigate={navigate}
            onCardClick={() => handleCardClick(item.Id)}
            isBoxSet={isBoxSet}
            boxSetFirstMovieId={boxSetFirstMovieId}
            touchDevice={touchDevice}
          />
        </div>
      </div>
      <div className="mt-2 text-center">
        <h3 className="text-white font-medium text-xs md:text-sm truncate">
          {item.Name}
        </h3>
        <p className="text-gray-400 text-[10px] md:text-xs truncate">
          {(() => {
            if (
              item.Type === "Episode" &&
              item.ParentIndexNumber &&
              item.IndexNumber
            ) {
              const episodeInfo = `S${item.ParentIndexNumber}:E${item.IndexNumber}`;
              const nameAppend = item.Name ? ` - ${item.Name}` : "";
              return episodeInfo + nameAppend;
            }
            return item.ProductionYear || item.SeriesName || "";
          })()}
        </p>
      </div>
    </div>
  );
};

// Utility to detect touch devices
function isTouchDevice() {
  return (
    globalThis.window !== undefined &&
    ("ontouchstart" in globalThis.window || navigator.maxTouchPoints > 0)
  );
}

export default MediaCard;
