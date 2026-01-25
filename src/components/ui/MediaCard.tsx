import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { useSetRecoilState } from "recoil";
import JellyfinApi from "../../api/jellyfin";
import { useAuth } from "../../context/AuthContext";
import activeItem from "../../states/atoms/ActiveItem";
import isDrawerOpen from "../../states/atoms/DrawerOpen";
import { MediaItem } from "../../types/jellyfin";

const USER_SETTINGS_KEY = "jellyfin_user_settings";
const DEFAULT_SHOW_QUALITY = false;

type UserSettings = {
  home?: {
    showQualityIndicators?: boolean;
  };
};

function readShowQualitySetting() {
  if (globalThis.window === undefined) return DEFAULT_SHOW_QUALITY;
  try {
    const raw = localStorage.getItem(USER_SETTINGS_KEY);
    if (!raw) return DEFAULT_SHOW_QUALITY;
    const settings = JSON.parse(raw) as UserSettings;
    return settings.home?.showQualityIndicators ?? DEFAULT_SHOW_QUALITY;
  } catch {
    return DEFAULT_SHOW_QUALITY;
  }
}

interface MediaCardProps {
  item: MediaItem;
  featured?: boolean;
  onSelectItem?: (itemId: string) => void;
  isHorizontal?: boolean;
  fluid?: boolean;
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

const MediaCard: React.FC<MediaCardProps> = ({
  item,
  featured = false,
  onSelectItem,
  isHorizontal = false,
  fluid = false,
}) => {
  const { api } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  // Track if device is touch
  const [touchDevice, setTouchDevice] = useState(false);
  const [showQualityIndicators, setShowQualityIndicators] = useState(
    readShowQualitySetting(),
  );
  const imageUrl = getImageUrl(api, item, featured, isHorizontal);
  const title = item.Name;
  const progressPercent = getProgressPercent(item);

  const setIsDrawerOpen = useSetRecoilState(isDrawerOpen);
  const setActiveTiemId = useSetRecoilState(activeItem);

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

  useEffect(() => {
    const updateSettings = () => {
      setShowQualityIndicators(readShowQualitySetting());
    };

    updateSettings();
    globalThis.window?.addEventListener(
      "user-settings-updated",
      updateSettings,
    );
    globalThis.window?.addEventListener("storage", updateSettings);

    return () => {
      globalThis.window?.removeEventListener(
        "user-settings-updated",
        updateSettings,
      );
      globalThis.window?.removeEventListener("storage", updateSettings);
    };
  }, []);

  // Determine aspect ratio and layout classes
  let aspectClasses: string;
  if (featured) {
    aspectClasses = "w-full aspect-[16/9]";
  } else if (isHorizontal) {
    aspectClasses =
      "aspect-[16/7] min-h-[150px] max-h-[160px] flex-row flex border border-white/20";
  } else {
    aspectClasses = "w-full aspect-[2/3] z-10 border border-white/20";
  }

  return (
    <div
      className={clsx(
        isHorizontal ? "w-[300px]" : fluid ? "w-full" : "w-[200px]",
        "",
      )}
    >
      <div
        className={clsx(
          "group relative transition-all duration-300 overflow-hidden bg-gray-900 cursor-pointer rounded-xl",
          aspectClasses,
          // isHovered && "z-10 shadow-xl",
          isHovered && "scale-[1.03] shadow-xl",

          isHorizontal
            ? "w-[300px]"
            : fluid
              ? "w-full"
              : "max-w-[200px] max-h-[300px]",
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
                ? "object-cover h-full min-w-[300px]"
                : "w-full h-full object-cover",
              isHorizontal ? "" : fluid ? "" : "max-w-[200px] max-h-[300px]",
            )}
          />
        ) : (
          <div
            className={clsx(
              isHorizontal
                ? "flex items-center justify-center bg-gray-800 h-full min-w-[200px]"
                : "w-full h-full flex items-center justify-center bg-gray-800",
              isHorizontal ? "" : fluid ? "" : "max-w-[200px] max-h-[300px]",
            )}
          >
            <span className="text-gray-400">{title}</span>
          </div>
        )}

        {/* Quality Badge (HD/4K) */}
        {showQualityIndicators && (item.IsHD || item.Is4K) && (
          <div className="absolute top-1 right-2 z-20">
            <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">
              {item.Is4K ? "4K" : "HD"}
            </span>
          </div>
        )}

        {/* Child Count */}
        {item.Type === "BoxSet" && item.ChildCount !== undefined && (
          <div className="absolute top-1 right-1 z-20">
            <span className="bg-[rgb(31,80,189)] text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full">
              {item.ChildCount}
            </span>
          </div>
        )}

        {progressPercent > 0 && (
          <div className="absolute left-0 right-0 bottom-0 h-1 rounded-lg bg-[rgba(128,128,128,.5)] z-10 m-4">
            <div
              className="h-full bg-gray-50 rounded-lg transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
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
