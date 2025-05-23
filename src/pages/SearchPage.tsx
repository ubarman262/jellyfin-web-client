import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import MediaCard from "../components/ui/MediaCard";
import { useSearch } from "../hooks/useMediaData";
import { Search as SearchIcon } from "lucide-react";

const SearchPage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get("q") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const { results, isLoading, totalResults } = useSearch(searchQuery);

  useEffect(() => {
    // Update query when URL changes
    const params = new URLSearchParams(location.search);
    const newQuery = params.get("q") ?? "";
    setSearchQuery(newQuery);
  }, [location.search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The search is performed automatically via the useSearch hook
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-16">
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
                placeholder="Search for movies, TV shows, people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Results */}
        {(() => {
          let resultsContent;
          if (isLoading) {
            resultsContent = (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full aspect-[2/3] bg-gray-800 animate-pulse rounded-md"
                  ></div>
                ))}
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
                    {isLoading ? "Searching..." : `Results for "${searchQuery}"`}
                  </h2>
                  {!isLoading && totalResults > 0 && (
                    <p className="text-gray-400">{totalResults} results found</p>
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
