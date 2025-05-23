import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";
import MediaDetailsDrawer from "./MediaDetailsDrawer";
import MoreInfoButton from "./moreInfoButton";
import PlayButton from "./playButton";

interface HeroBannerProps {
  items: MediaItem[];
  autoSlideInterval?: number;
}

const HeroBanner: React.FC<HeroBannerProps> = ({
  items,
  autoSlideInterval = 7000,
}) => {
  const { api } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!api) return;

    const preloadImages = () => {
      items.forEach((item) => {
        if (item.BackdropImageTags?.length) {
          const url = api.getImageUrl(item.Id, "Backdrop", 1920);
          const img = new window.Image();
          img.src = url;
        }
      });
    };

    preloadImages();
  }, [api, items]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items]);

  useEffect(() => {
    if (!api || items.length === 0) return;
    const currentItem = items[currentIndex];
    if (currentItem.BackdropImageTags?.length) {
      const img = new window.Image();
      img.src = api.getImageUrl(currentItem.Id, "Backdrop", 1920);
    }

    if (autoSlideInterval > 0 && !modalOpen) {
      timeoutRef.current = setTimeout(goToNext, autoSlideInterval);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, api, autoSlideInterval, modalOpen, goToNext, items]);

  if (!api || !items) return null;

  return (
    <>
      <div className="relative w-full h-[70vh] overflow-hidden mb-8">
        {items.map((item, index) => {
          const isActive = index === currentIndex;
          const genres = item.Genres ?? [];
          const backdropUrl = item.BackdropImageTags?.length
            ? api.getImageUrl(item.Id, "Backdrop", 1920)
            : "";

          return (
            <div
              key={item.Id}
              className={clsx(
                "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
                isActive
                  ? "opacity-100 z-10"
                  : "opacity-0 z-0 pointer-events-none"
              )}
            >
              {backdropUrl ? (
                <>
                  <img
                    src={backdropUrl}
                    alt={item.Name}
                    className="w-full h-full object-cover object-center"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-neutral-900/20" />
                  <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-neutral-900" />
              )}

              <div className="absolute inset-0 flex items-end md:items-center p-8">
                <div className="container mx-auto">
                  <div className="max-w-2xl space-y-4">
                    <h1
                      className={clsx(
                        "text-4xl md:text-6xl font-bold text-white transition-transform duration-700",
                        isActive
                          ? "translate-y-0 opacity-100"
                          : "translate-y-8 opacity-0"
                      )}
                    >
                      {item.ImageTags?.Logo ? (
                        <img
                          src={api.getImageUrl(item.Id, "Logo", 400)}
                          alt={item.Name}
                          className="max-h-20 md:max-h-28 w-auto object-contain"
                          style={{ display: "inline-block" }}
                        />
                      ) : (
                        item.Name
                      )}
                    </h1>

                    <div
                      className={clsx(
                        "flex items-center gap-3 text-sm text-gray-300 transition-transform duration-700 delay-100",
                        isActive
                          ? "translate-y-0 opacity-100"
                          : "translate-y-8 opacity-0"
                      )}
                    >
                      {item.ProductionYear && (
                        <span>{item.ProductionYear}</span>
                      )}
                      {genres?.length > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-500" />
                          <span>{genres.slice(0, 3).join(", ")}</span>
                        </>
                      )}
                    </div>

                    <p
                      className={clsx(
                        "text-gray-300 line-clamp-3 md:line-clamp-4 transition-transform duration-700 delay-200",
                        isActive
                          ? "translate-y-0 opacity-100"
                          : "translate-y-8 opacity-0"
                      )}
                    >
                      {item.Overview}
                    </p>

                    <div
                      className={clsx(
                        "flex flex-col items-stretch gap-3 mt-6 transition-transform duration-700 delay-300 md:flex-row md:items-center md:gap-4 md:mt-0",
                        isActive
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
                        onClick={() => setModalOpen(true)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Carousel dots */}
        {items.length > 1 && (
          <div className="absolute inset-x-0 bottom-10 flex justify-center gap-4 z-10">
            {items.map((_, index) => (
              <button
                key={index}
                className={clsx(
                  "w-2 h-2 rounded-full transition-colors",
                  currentIndex === index ? "bg-white" : "bg-white/30"
                )}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      <MediaDetailsDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        itemId={items[currentIndex].Id}
      />
    </>
  );
};

export default HeroBanner;
