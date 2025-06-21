import React, { useRef } from "react";
import { useGenres } from "../../hooks/useMediaData";
import { useNavigate } from "react-router-dom";

const genreColors = [
  "bg-red-700/80",
  "bg-purple-700/80",
  "bg-blue-700/80",
  "bg-yellow-700/80",
  "bg-indigo-900/80",
  "bg-green-700/80",
  "bg-pink-700/80",
  "bg-orange-700/80",
  "bg-cyan-700/80",
  "bg-teal-700/80",
];

const GenreSection: React.FC = () => {
  const { genres, isLoading } = useGenres();
  const navigate = useNavigate();
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const { clientWidth } = rowRef.current;
    const scrollAmount = clientWidth * 0.8;
    const scrollPos =
      direction === "left"
        ? rowRef.current.scrollLeft - scrollAmount
        : rowRef.current.scrollLeft + scrollAmount;
    rowRef.current.scrollTo({
      left: scrollPos,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Movie Genres</h2>
        <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from({ length: 6 }).map(() => (
            <div
              key={`genre-skeleton-${crypto.randomUUID()}`}
              className="rounded-lg w-56 h-32 bg-gray-800 animate-pulse flex-shrink-0"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (!genres.length) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Movie Genres</h2>
        <div className="flex gap-2">
          <button
            className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            type="button"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            type="button"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={rowRef}
        className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        {genres.map((genre, i) => (
          <div
            key={genre.Id}
            className={`rounded-lg w-56 h-32 flex items-center justify-center cursor-pointer shadow-md flex-shrink-0 group relative ${genreColors[i % genreColors.length]}`}
            onClick={() => navigate(`/search?q=${encodeURIComponent(genre.Name)}`)}
            title={genre.Name}
            tabIndex={0}
            role="button"
            aria-label={`Browse ${genre.Name}`}
          >
            <span className="text-2xl font-bold text-white drop-shadow-lg z-10">
              {genre.Name}
            </span>
            <div className="absolute inset-0 rounded-lg group-hover:bg-black/20 transition" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenreSection;
