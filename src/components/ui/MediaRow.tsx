import React, { useRef, useState } from "react";
import { MediaItem } from "../../types/jellyfin";
import MediaCard from "./MediaCard";
import MediaRowNavigation from "./MediaRowNavigation";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  isLoading?: boolean;
}

const MediaRow: React.FC<MediaRowProps> = ({
  title,
  items,
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
        <div className="flex overflow-x-scroll scrollbar-hide gap-4 pb-4">
          {Array.from({ length: 6 }).map(() => {
            const uniqueKey = `media-row-skeleton-${Math.random().toString(36).substring(2, 11)}`;
            return (
              <div
                key={uniqueKey}
                className="flex-none w-[160px] sm:w-[180px] md:w-[200px] aspect-[2/3] bg-gray-800 animate-pulse rounded-md"
              ></div>
            );
          })}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
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
          {items.map((item) => (
            <div
              key={item.Id}
              className="flex-none w-[160px] sm:w-[180px] md:w-[200px] transition-transform"
            >
              <MediaCard key={item.Id} item={item} />
            </div>
          ))}
        </div>

        <MediaRowNavigation
          showLeftArrow={showLeftArrow}
          showRightArrow={showRightArrow}
          isScrolling={isScrolling}
          onScrollLeft={() => scroll("left")}
          onScrollRight={() => scroll("right")}
          itemsLength={items.length}
        />
      </div>
    </div>
  );
};

export default MediaRow;
