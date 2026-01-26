import React from "react";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";
import PlayButton from "./playButton";
import MoreInfoButton from "./moreInfoButton";

interface FeaturedMediaOverlayProps {
  item: MediaItem;
  genres?: string[];
  className?: string;
  setActiveItemId: (id: string) => void;
  setIsDrawerOpen: (isOpen: boolean) => void;
}

/**
 * Displays the logo (or title), year, genres, and overview for a featured media item.
 */
const FeaturedMediaOverlay: React.FC<FeaturedMediaOverlayProps> = ({
  item,
  genres = [],
  className = "",
  setActiveItemId,
  setIsDrawerOpen,
}) => {
  const { api } = useAuth();

  if (!api || !item) return null;
  const officialRating = item.OfficialRating ?? [];
  const overview = item.Overview ?? "";
  return (
    <>
      {/* Logo or Title */}
      <div
        className={clsx(
          "absolute px-14 bottom-[45%] z-10 max-w-2xl",
          className,
        )}
      >
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
      {/* Year and Genres */}
      <div
        className={clsx(
          "flex items-center gap-3 text-sm text-gray-300 transition-transform duration-700 delay-100 absolute px-14 bottom-[38%] z-10 max-w-2xl mb-2",
          "translate-y-0 opacity-100",
          className,
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
      {/* Overview */}
      <p
        className={clsx(
          "text-sm text-gray-300 line-clamp-3 md:line-clamp-4 transition-transform duration-700 delay-200 w-160 md:w-3/5 absolute px-14 bottom-[30%] z-10 max-w-2xl mb-2",
          "translate-y-0 opacity-100",
          className,
        )}
        style={{ wordBreak: "break-word", whiteSpace: "pre-line" }}
      >
        {overview.split(" ").length > 20
          ? `${overview.split(" ").slice(0, 20).join(" ")}...`
          : overview}
      </p>
      {/* Official Rating */}
      <div>
        <span
          className="absolute right-0 bottom-[14rem] z-10 max-w-2xl w-40"
          style={{
            background: "rgba(55, 65, 81, 0.55)",
            color: "#fff",
            padding: "0.5rem 1.25rem",
            fontWeight: 500,
            fontSize: "1.25rem",
            letterSpacing: "0.01em",
            display: "inline-block",
            borderLeft: "4px solid rgba(255,255,255,0.5)",
            backdropFilter: "blur(2px)",
          }}
        >
          {officialRating}
        </span>
      </div>
      <div className="absolute px-14 bottom-[18%] z-10 max-w-2xl flex gap-4">
        <PlayButton itemId={item.Id} type={item.Type} width={200} height={50} />
        <MoreInfoButton
          onClick={() => {
            setActiveItemId(item.Id);
            setIsDrawerOpen(true);
          }}
          width={200}
          height={50}
        />
      </div>

      {/* Fade overlay between video and details */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[200px] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(23,23,23,0) 0%, #171717 90%)",
          zIndex: 9,
          transition: "height 0.3s ease",
        }}
      />
    </>
  );
};

export default FeaturedMediaOverlay;
