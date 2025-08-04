import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";
import MoreInfoButton from "./moreInfoButton";
import PlayButton from "./playButton";
import { useRecoilState, useSetRecoilState } from "recoil";
import drawerState from "../../states/atoms/DrawerOpen";
import activeItem from "../../states/atoms/ActiveItem";

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

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useRecoilState(drawerState);
  const setActiveTiemId = useSetRecoilState(activeItem);

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

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const deltaX = touchEndX.current - touchStartX.current;
      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  useEffect(() => {
    if (!api || items.length === 0) return;
    const currentItem = items[currentIndex];
    if (currentItem.BackdropImageTags?.length) {
      const img = new window.Image();
      img.src = api.getImageUrl(currentItem.Id, "Backdrop", 1920);
    }

    if (autoSlideInterval > 0 && !isDrawerOpen) {
      timeoutRef.current = setTimeout(goToNext, autoSlideInterval);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, api, autoSlideInterval, isDrawerOpen, goToNext, items]);

  if (!api || !items) return null;

  return (
    <div
      className="relative w-full h-[70vh] overflow-hidden mb-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Arrow buttons */}
      {items.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 text-white rounded-full w-10 h-10 flex items-center justify-center focus:outline-none"
            style={{ backdropFilter: "blur(2px)" }}
            onClick={goToPrev}
            aria-label="Previous"
            tabIndex={0}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 text-white rounded-full w-10 h-10 flex items-center justify-center focus:outline-none"
            style={{ backdropFilter: "blur(2px)" }}
            onClick={goToNext}
            aria-label="Next"
            tabIndex={0}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

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
              "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out cursor-pointer",
              isActive
                ? "opacity-100 z-10"
                : "opacity-0 z-0 pointer-events-none"
            )}
            onClick={() => {
              setActiveTiemId(item.Id);
              setIsDrawerOpen(true);
            }}
          >
            {backdropUrl ? (
              <>
                <img
                  src={backdropUrl}
                  alt={item.Name}
                  className="w-full h-full object-cover object-center"
                  draggable={false}
                />
                {/* <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/70 via-neutral-900/40 to-neutral-900/10" /> */}
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/60 to-transparent" />
                <div
                  className="absolute bottom-0 left-0 right-0 h-44 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(23,23,23,0) 0%, #171717 90%)",
                    zIndex: 10,
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-neutral-900" />
            )}

            <div className="absolute inset-0 flex items-end md:items-end bottom-32">
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
                      <div>
                        <h1 style={{ fontSize: "2.5rem" }}>{item.Name}</h1>
                      </div>
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
                    {item.ProductionYear && <span>{item.ProductionYear}</span>}
                    {genres?.length > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-500" />
                        <span>{genres.slice(0, 3).join(", ")}</span>
                      </>
                    )}
                  </div>

                  {/* <p
                    className={clsx(
                      "text-gray-300 line-clamp-3 md:line-clamp-4 transition-transform duration-700 delay-200",
                      isActive
                        ? "translate-y-0 opacity-100"
                        : "translate-y-8 opacity-0"
                    )}
                  >
                    {item.Overview}
                  </p> */}

                  <div
                    className={clsx(
                      // Only add bottom margin on mobile, remove on md+
                      "flex flex-col items-stretch gap-3 mt-6 transition-transform duration-700 delay-300 md:flex-row md:items-center md:gap-4 md:mt-0 mb-24 md:mb-0",
                      isActive
                        ? "translate-y-0 opacity-100"
                        : "translate-y-8 opacity-0"
                    )}
                  >
                    <PlayButton
                      itemId={item.Id}
                      type={item.Type}
                      width={120}
                      height={45}
                    />
                    {/* <MoreInfoButton
                      width={130}
                      height={45}
                      onClick={() => {
                        setActiveTiemId(item.Id);
                        setIsDrawerOpen(true);
                      }}
                    /> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Carousel dots */}
      {items.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 md:bottom-20 flex justify-center gap-4 z-10">
          {items.map((item, index) => (
            <button
              key={item.Id}
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
  );
};

export default HeroBanner;
