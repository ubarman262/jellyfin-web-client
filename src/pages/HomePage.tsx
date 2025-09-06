import React, { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import HeroBanner from "../components/ui/HeroBanner";
import MediaRow from "../components/ui/MediaRow";
import StudiosSection from "../components/ui/StudiosSection";
import { useMediaData } from "../hooks/useMediaData";
import { MediaItem } from "../types/jellyfin";

const HomePage: React.FC = () => {
  const [featuredItems, setFeaturedItems] = useState<MediaItem[] | null>(null);

  const { items: resumeItems, isLoading: resumeLoading } = useMediaData(
    "resume",
    { limit: 20 }
  );
  const { items: nextUpItems, isLoading: nextUpLoading } = useMediaData(
    "nextup",
    { limit: 20 }
  );

  const { items: latestItems } = useMediaData("latest", { limit: 20 });

  const { items: latestMovies, isLoading: LatestMoviesLoading } = useMediaData(
    "latest",
    { limit: 20, mediaType: "Movie" }
  );
  const { items: latestShows, isLoading: LatestShowsLoading } = useMediaData(
    "latest",
    { limit: 20, mediaType: "Series" }
  );

  useEffect(() => {
    // Select a featured item from latest or movies
    if (latestItems.length > 0) {
      // Find an item with backdrop image
      const itemsWithBackdrop = latestItems.filter(
        (item) => item.BackdropImageTags && item.BackdropImageTags.length > 0
      );

      if (itemsWithBackdrop) {
        setFeaturedItems(itemsWithBackdrop);
      } else {
        setFeaturedItems(latestItems);
      }
    }
  }, [latestItems]);

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />

      {/* Hero Section */}
      {featuredItems ? (
        <HeroBanner items={featuredItems} />
      ) : (
        <div className="w-full h-[85vh] bg-neutral-800 animate-pulse"></div>
      )}

      {/* Content Rows */}
      <div className="px-14 mt-[20px] relative z-10 sm:mt-[-4rem] mb-16">
        <MediaRow
          title="Continue Watching"
          items={resumeItems}
          isLoading={resumeLoading}
        />

        <MediaRow
          title="Next Up"
          items={nextUpItems}
          isLoading={nextUpLoading}
        />

        <MediaRow
          title="Latest Movies"
          items={latestMovies}
          isLoading={LatestMoviesLoading}
        />

        <MediaRow
          title="Latest Shows"
          items={latestShows}
          isLoading={LatestShowsLoading}
        />

        {/* Studios Section */}
        <StudiosSection />
      </div>
    </div>
  );
};

export default HomePage;
