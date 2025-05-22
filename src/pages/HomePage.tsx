import React, { useState, useEffect } from "react";
import Navbar from "../components/layout/Navbar";
import HeroBanner from "../components/ui/HeroBanner";
import MediaRow from "../components/ui/MediaRow";
import { useMediaData } from "../hooks/useMediaData";
import { MediaItem } from "../types/jellyfin";

const HomePage: React.FC = () => {
  const [featuredItem, setFeaturedItem] = useState<MediaItem | null>(null);

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
      const itemWithBackdrop = latestItems.find(
        (item) => item.BackdropImageTags && item.BackdropImageTags.length > 0
      );

      if (itemWithBackdrop) {
        setFeaturedItem(itemWithBackdrop);
      } else {
        setFeaturedItem(latestItems[0]);
      }
    } else if (moviesItems.length > 0) {
      const itemWithBackdrop = moviesItems.find(
        (item) => item.BackdropImageTags && item.BackdropImageTags.length > 0
      );

      if (itemWithBackdrop) {
        setFeaturedItem(itemWithBackdrop);
      } else {
        setFeaturedItem(moviesItems[0]);
      }
    }
  }, [latestItems, moviesItems]);

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Navbar />

      {/* Hero Section */}
      {featuredItem ? (
        <HeroBanner item={featuredItem} />
      ) : (
        <div className="w-full h-[70vh] bg-neutral-800 animate-pulse"></div>
      )}

      {/* Content Rows */}
      <div className="container mx-auto px-4 -mt-16 relative z-10 mt-[20px] sm:mt-[-4rem]">
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

        {/* <MediaRow 
          title="Recommended for You" 
          items={recommendedItems} 
          isLoading={recommendedLoading} 
        /> */}

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
      </div>
    </div>
  );
};

export default HomePage;
