import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import MediaCard from "../components/ui/MediaCard";
import { useAuth } from "../context/AuthContext";
import { MediaItem } from "../types/jellyfin";

const PAGE_SIZE = 100;

const StudioDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const studioId = searchParams.get("studioId") ?? "";
  const { api } = useAuth();
  const [studioName, setStudioName] = useState<string>("");
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!api || !studioId) return;
    setIsLoading(true);

    api
      .getMediaItem(studioId)
      .then((res) => {
        if (res) {
          setStudioName(res.Name);
        } else {
          setStudioName("Studio");
        }
      })
      .catch(() => setStudioName("Studio"));

    // Fetch items for this studio
    api
      .getItemsByStudioId(studioId, PAGE_SIZE)
      .then((res) => setMovies(res.Items ?? []))
      .catch(() => setMovies([]))
      .finally(() => setIsLoading(false));
  }, [api, studioId]);

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <h1 className="text-3xl font-bold mb-8">{studioName}</h1>
        {(() => {
          if (isLoading) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map(() => (
                  <div
                    key={`skeleton-${Math.random().toString(36).slice(2, 11)}`}
                    className="w-full aspect-[2/3] bg-gray-800 animate-pulse rounded-md"
                  ></div>
                ))}
              </div>
            );
          } else if (movies.length > 0) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {movies.map((item) => (
                  <MediaCard key={item.Id} item={item} />
                ))}
              </div>
            );
          } else {
            return (
              <div className="text-center py-12 text-gray-400">
                No movies found for this studio.
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
};

export default StudioDetailsPage;
