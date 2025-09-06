import { Search as SearchIcon, Shuffle as ShuffleIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import MediaCard from "../components/ui/MediaCard";
import { useSearch } from "../hooks/useMediaData";

const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get("q") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  // Debounce timer state (not strictly necessary, but for cleanup)
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const { results, isLoading, totalResults, suggestions, reloadSuggestions } =
    useSearch(searchQuery);

  useEffect(() => {
    // Update query when URL changes
    const params = new URLSearchParams(location.search);
    const newQuery = params.get("q") ?? "";
    setSearchQuery(newQuery);
  }, [location.search]);

  // Debounce effect for updating URL as user types
  useEffect(() => {
    // Don't debounce on initial mount if query matches URL
    if (searchQuery === (new URLSearchParams(location.search).get("q") ?? ""))
      return;

    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`, {
        replace: true,
      });
    }, 600); // 600ms debounce
    setDebounceTimer(timer);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Immediate update on submit
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleItemClick = (itemId: string) => {
    navigate("/search?item=" + itemId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />

      <div className="px-14 pt-24 pb-16">
        {/* Search Form */}
        <div className="mb-8">
          <form
            onSubmit={handleSubmit}
            className="flex items-center max-w-2xl mx-auto"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for Movies, Shows..."
                value={searchQuery}
                onChange={handleInputChange}
                className="bg-gray-800 w-full pl-10 pr-4 py-3 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <button
              type="submit"
              className="bg-red-600 text-white px-6 py-3 rounded-r-md hover:bg-red-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Genre Section */}
        {/* <div className="container mx-auto px-4 mt-[-2rem] z-10">
          <GenreSection />
        </div> */}

        {/* Suggestions when searchQuery is empty */}
        {!searchQuery && suggestions.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-left">Suggestions</h2>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                onClick={reloadSuggestions}
                aria-label="Shuffle suggestions"
              >
                <ShuffleIcon size={20} className="text-red-500" />
                <span className="text-sm text-white">Shuffle</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {suggestions.map((item) => (
                <div
                  key={item.Id}
                  onClick={() => handleItemClick(item.Id)}
                  className="cursor-pointer"
                >
                  <MediaCard item={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {(() => {
          let resultsContent;
          if (isLoading) {
            resultsContent = (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => {
                  const uniqueKey = `skeleton-${Date.now()}-${i}`;
                  return (
                    <div
                      key={uniqueKey}
                      className="w-full aspect-[2/3] bg-gray-800 animate-pulse rounded-md"
                    ></div>
                  );
                })}
              </div>
            );
          } else if (results.length > 0) {
            resultsContent = (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.map((item) => (
                  <MediaCard key={item.Id} item={item} />
                ))}
              </div>
            );
          } else if (searchQuery) {
            resultsContent = (
              <div className="text-center py-12">
                <p className="text-gray-400">
                  No results found for "{searchQuery}"
                </p>
                <p className="text-sm mt-2">
                  Try a different search term or browse categories
                </p>
              </div>
            );
          } else {
            resultsContent = (
              <div className="text-center py-12">
                <SearchIcon size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">
                  Enter a search term to find movies, TV shows, and more
                </p>
              </div>
            );
          }
          return (
            <div className="space-y-8">
              {searchQuery && (
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-medium">
                    {isLoading
                      ? "Searching..."
                      : `Results for "${searchQuery}"`}
                  </h2>
                  {!isLoading && totalResults > 0 && (
                    <p className="text-gray-400">
                      {totalResults} results found
                    </p>
                  )}
                </div>
              )}
              {resultsContent}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SearchPage;
