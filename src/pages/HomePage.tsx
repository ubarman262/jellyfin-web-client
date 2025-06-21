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
  const { items: latestItems, isLoading: latestLoading } = useMediaData(
    "latest",
    { limit: 20 }
  );
  const { items: moviesItems, isLoading: moviesLoading } = useMediaData(
    "movies",
    { limit: 20 }
  );
  const { items: seriesItems, isLoading: seriesLoading } = useMediaData(
    "series",
    { limit: 20 }
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
  }, [latestItems, moviesItems]);

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />

      {/* Hero Section */}
      {featuredItems ? (
        <HeroBanner items={featuredItems} />
      ) : (
        <div className="w-full h-[70vh] bg-neutral-800 animate-pulse"></div>
      )}

      {/* Content Rows */}
      <div className="container mx-auto px-4 mt-[20px] relative z-10 sm:mt-[-4rem] mb-16">
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
          title="Latest Additions"
          items={latestItems}
          isLoading={latestLoading}
        />

        <MediaRow
          title="Movies"
          items={moviesItems}
          isLoading={moviesLoading}
        />

        <MediaRow
          title="TV Shows"
          items={seriesItems}
          isLoading={seriesLoading}
        />

        {/* Studios Section */}
        <StudiosSection />
      </div>
    </div>
  );
};

export default HomePage;
