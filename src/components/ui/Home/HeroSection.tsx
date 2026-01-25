import React, { useEffect, useState } from "react";
import HeroBanner from "../HeroBanner";
import { useMediaData } from "../../../hooks/useMediaData";
import { MediaItem } from "../../../types/jellyfin";

const HeroSection: React.FC = () => {
  const [featuredItems, setFeaturedItems] = useState<MediaItem[] | null>(null);
  const { items: latestItems } = useMediaData("latest");

  useEffect(() => {
    if (latestItems.length > 0) {
      const itemsWithBackdrop = latestItems.filter(
        (item) => item.BackdropImageTags && item.BackdropImageTags.length > 0,
      );

      if (itemsWithBackdrop.length > 0) {
        setFeaturedItems(itemsWithBackdrop);
      } else {
        setFeaturedItems(latestItems);
      }
    }
  }, [latestItems]);

  if (!featuredItems) {
    return (
      <div className="relative w-full h-[95vh] overflow-hidden mb-8">
        {/* Arrow placeholders */}
        <div className="absolute left-4 top-1/2 z-20 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-700/60 animate-pulse" />
        <div className="absolute right-4 top-1/2 z-20 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-700/60 animate-pulse" />

        {/* Mobile skeleton */}
        <div className="md:hidden flex justify-center items-center h-full mx-4">
          <div className="relative w-full h-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-end bg-neutral-800 animate-pulse" style={{ maxHeight: "80vh" }}>
            <div className="w-full z-10 flex flex-col items-center pb-4 px-4 gap-3">
              <div className="h-6 w-40 bg-neutral-700/70 rounded" />
              <div className="space-y-2 w-full">
                <div className="h-3 w-full bg-neutral-700/60 rounded" />
                <div className="h-3 w-5/6 bg-neutral-700/60 rounded" />
                <div className="h-3 w-2/3 bg-neutral-700/60 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop/tablet skeleton */}
        <div className="hidden md:block absolute inset-0">
          <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/60 to-transparent" />
          <div
            className="absolute bottom-0 left-0 right-0 h-44 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(23,23,23,0) 0%, #171717 90%)",
              zIndex: 10,
            }}
          />
          <div className="absolute inset-0 flex items-end md:items-end bottom-32">
            <div className="container pl-6 md:pl-12">
              <div className="max-w-2xl space-y-4">
                <div className="h-10 md:h-14 w-72 md:w-96 bg-neutral-700/70 rounded animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 bg-neutral-700/60 rounded" />
                  <div className="h-4 w-24 bg-neutral-700/60 rounded" />
                  <div className="h-4 w-20 bg-neutral-700/60 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-neutral-700/50 rounded" />
                  <div className="h-4 w-11/12 bg-neutral-700/50 rounded" />
                  <div className="h-4 w-4/5 bg-neutral-700/50 rounded" />
                </div>
                <div className="flex gap-3 pt-2">
                  <div className="h-10 w-32 bg-neutral-700/70 rounded-full" />
                  <div className="h-10 w-28 bg-neutral-700/60 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <HeroBanner items={featuredItems} />;
};

export default HeroSection;
