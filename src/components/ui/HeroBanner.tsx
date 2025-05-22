import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";
import MediaDetailsModal from "./MediaDetailsModal";
import MoreInfoButton from "./moreInfoButton";
import PlayButton from "./playButton";

interface HeroBannerProps {
  item: MediaItem;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ item }) => {
  const { api } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState<string>("");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Modal open if URL matches /details/{item.Id}
  const modalOpen = location.pathname === `/details/${item.Id}`;

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

  if (!api || !item) return null;

  const title = item.Name;
  const overview = item.Overview;
  const year = item.ProductionYear;
  const genres = item.Genres || [];

  return (
    <>
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
                  // Always stack vertically on mobile, add spacing above
                  "flex flex-col items-stretch gap-3 mt-6 transition-transform duration-700 delay-300 md:flex-row md:items-center md:gap-4 md:mt-0",
                  isLoaded
                    ? "translate-y-0 opacity-100"
                    : "translate-y-8 opacity-0"
                )}
              >
                <PlayButton
                  itemId={item.Id}
                  type={item.Type}
                  width={150}
                  height={50}
                />
                <MoreInfoButton
                  width={150}
                  height={50}
                  // Open modal by navigating to /details/{item.Id}
                  onClick={() => navigate(`/details/${item.Id}`)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <MediaDetailsModal
        open={modalOpen}
        onClose={() => {
          if (location.pathname.startsWith("/details/")) {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }
        }}
        itemId={item.Id}
      />
    </>
  );
};

export default HeroBanner;
