import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useRef, useState } from "react";
import { MediaItem } from "../../types/jellyfin";
import MediaCard from "./MediaCard";

interface EpisodeRowProps {
  title: string;
  episodes: MediaItem[];
  isLoading?: boolean;
}

const EpisodeRow: React.FC<EpisodeRowProps> = ({
  title,
  episodes,
  isLoading = false,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);

  const checkArrows = () => {
    if (!rowRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    const maxScrollLeft = scrollWidth - clientWidth;

    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < maxScrollLeft - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;

    setIsScrolling(true);

    const { clientWidth } = rowRef.current;
    const scrollAmount = clientWidth * 0.9;
    const scrollPos =
      direction === "left"
        ? rowRef.current.scrollLeft - scrollAmount
        : rowRef.current.scrollLeft + scrollAmount;

    rowRef.current.scrollTo({
      left: scrollPos,
      behavior: "smooth",
    });

    setTimeout(() => {
      setIsScrolling(false);
      checkArrows();
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-medium text-white mb-2">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map(() => {
            const skeletonKey = `media-row-skeleton-${Math.random().toString(36).substring(2, 11)}`;
            return (
              <div
                key={skeletonKey}
                className="w-full aspect-[2/3] bg-gray-800 animate-pulse rounded-md"
              ></div>
            );
          })}
        </div>
      </div>
    );
  }

  if (episodes.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 group/row">
      <h2 className="text-xl font-medium text-white mb-2">{title}</h2>

      <div className="relative">
        <div
          ref={rowRef}
          className="flex overflow-x-scroll scrollbar-hide gap-4 pb-4"
          onScroll={checkArrows}
        >
          {episodes.map((item) => (
            <div
              key={item.Id}
              className="flex-none w-[160px] sm:w-[180px] md:w-[200px] transition-transform"
            >
              <MediaCard item={item} />
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={() => scroll("left")}
          className={clsx(
            "absolute top-1/2 left-0 -translate-y-1/2 -ml-4 z-20",
            "w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center",
            "transition-opacity backdrop-blur-sm hover:bg-black/80",
            "opacity-0",
            showLeftArrow && !isScrolling && "group-hover/row:opacity-100"
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft />
        </button>

        <button
          onClick={() => scroll("right")}
          className={clsx(
            "absolute top-1/2 right-0 -translate-y-1/2 -mr-4 z-20",
            "w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center",
            "transition-opacity backdrop-blur-sm hover:bg-black/80",
            "opacity-0",
            showRightArrow && !isScrolling && "group-hover/row:opacity-100"
          )}
          aria-label="Scroll right"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

export default EpisodeRow;
