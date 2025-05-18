import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMediaItem } from "../hooks/useMediaData";
import Navbar from "../components/layout/Navbar";
import { Play, Info, Clock, Calendar, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MediaDetailsPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { item, isLoading, error } = useMediaItem(itemId);
  const { api } = useAuth();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    // Reset image loaded state when item changes
    setIsImageLoaded(false);
  }, [itemId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error || !item || !api) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <Navbar />
        <div className="pt-16 container mx-auto px-4 py-12">
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p>Failed to load media details. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasBackdropImage =
    item.BackdropImageTags && item.BackdropImageTags.length > 0;
  const hasPrimaryImage = item.ImageTags && item.ImageTags.Primary;

  let backdropUrl = "";
  let posterUrl = "";

  if (hasBackdropImage) {
    backdropUrl = api.getImageUrl(item.Id, "Backdrop", 1920);
  }

  if (hasPrimaryImage) {
    posterUrl = api.getImageUrl(item.Id, "Primary", 400);
  }

  // Format runtime from ticks to minutes
  const formatRuntime = (ticks?: number) => {
    if (!ticks) return "";

    const totalMinutes = Math.floor(ticks / (10000 * 1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format date to year only
  const formatYear = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).getFullYear();
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />

      {/* Hero Section with Backdrop */}
      <div className="relative w-full min-h-[80vh]">
        {/* Backdrop Image */}
        {backdropUrl && (
          <>
            <img
              src={backdropUrl}
              alt={item.Name}
              onLoad={() => setIsImageLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
                isImageLoaded ? "opacity-30" : "opacity-0"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/70 to-neutral-900/30"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 to-transparent"></div>
          </>
        )}

        {/* Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 pt-16">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Poster */}
              <div className="md:flex-shrink-0">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={item.Name}
                    className="w-full md:w-64 lg:w-72 rounded-md shadow-lg"
                  />
                ) : (
                  <div className="w-full md:w-64 lg:w-72 aspect-[2/3] bg-gray-800 rounded-md flex items-center justify-center">
                    <span className="text-gray-500">{item.Name}</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-4">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  {item.Name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                  {item.ProductionYear && (
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>{item.ProductionYear}</span>
                    </div>
                  )}

                  {item.RunTimeTicks && (
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{formatRuntime(item.RunTimeTicks)}</span>
                    </div>
                  )}

                  {item.OfficialRating && (
                    <span className="px-1.5 py-0.5 bg-gray-800 text-gray-300 text-xs rounded">
                      {item.OfficialRating}
                    </span>
                  )}

                  {item.CommunityRating && (
                    <div className="flex items-center gap-1">
                      <Star
                        size={16}
                        className="text-yellow-500 fill-yellow-500"
                      />
                      <span>{item.CommunityRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {item.Genres && item.Genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.Genres.map((genre, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-gray-300 max-w-3xl">
                  {item.Overview || "No overview available."}
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <Link
                    to={`/play/${item.Id}`}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors"
                  >
                    <Play size={20} />
                    <span>Play</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailsPage;
