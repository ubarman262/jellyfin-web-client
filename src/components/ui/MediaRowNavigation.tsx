import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

interface MediaRowNavigationProps {
  showLeftArrow: boolean;
  showRightArrow: boolean;
  isScrolling: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  itemsLength: number;
}

const MediaRowNavigation: React.FC<MediaRowNavigationProps> = ({
  showLeftArrow,
  showRightArrow,
  isScrolling,
  onScrollLeft,
  onScrollRight,
  itemsLength,
}) =>
  itemsLength > 1 ? (
    <>
      <button
        onClick={onScrollLeft}
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
        onClick={onScrollRight}
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
    </>
  ) : null;

export default MediaRowNavigation;
