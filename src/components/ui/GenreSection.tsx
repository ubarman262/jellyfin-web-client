import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";

const TARGET_GENRES = [
  {
    name: "Action",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000",
  },
  {
    name: "Animation",
    image: "https://images.unsplash.com/photo-1524253482453-3fed8d2fe12b?auto=format&fit=crop&q=80&w=1000",
  },
  {
    name: "Comedy",
    image: "https://images.unsplash.com/photo-1527224538127-2104bb71c61e?auto=format&fit=crop&q=80&w=1000",
  },
  {
    name: "Crime",
    image: "https://images.unsplash.com/photo-1550982560-eb557161bcfc?auto=format&fit=crop&q=80&w=1000",
  },
  {
    name: "Drama",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1000",
  },
  {
    name: "Horror",
    image: "https://images.unsplash.com/photo-1505635552518-3448ff116af3?auto=format&fit=crop&q=80&w=1000",
  },
  {
    name: "Sci-Fi",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000",
  }
];

const genreColors = [
  "bg-red-700/80",
  "bg-purple-700/80",
  "bg-blue-700/80",
  "bg-yellow-700/80",
  "bg-indigo-900/80",
  "bg-green-700/80",
  "bg-pink-700/80",
];

const GenreSection: React.FC = () => {
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
        {TARGET_GENRES.map((genre, i) => (
          <div
            key={genre.name}
            className={`rounded-lg w-56 h-32 flex items-center justify-center cursor-pointer shadow-md flex-shrink-0 group relative overflow-hidden ${genreColors[i % genreColors.length]}`}
            onClick={() => navigate(`/search?q=${encodeURIComponent(genre.name)}`)}
            title={genre.name}
            tabIndex={0}
            role="button"
            aria-label={`Browse ${genre.name}`}
          >
            <img
              src={genre.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />
            <span className="text-2xl font-bold text-white drop-shadow-lg z-10 relative px-4 text-center">
              {genre.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenreSection;
