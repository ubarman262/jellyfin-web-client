import React, { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import HeroBanner from "../components/ui/HeroBanner";
import MediaRow from "../components/ui/MediaRow";
import { useMediaData } from "../hooks/useMediaData";
import { MediaItem } from "../types/jellyfin";
import { useAuth } from "../context/AuthContext";
import { useNavigate, createSearchParams } from "react-router-dom";

const HomePage: React.FC = () => {
  const [featuredItems, setFeaturedItems] = useState<MediaItem[] | null>(null);
  const { api } = useAuth();
  const [studioApiList, setStudioApiList] = useState<{ Name: string; Id: string }[]>([]);
  const navigate = useNavigate();

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

  const studios = React.useMemo(
    () => [
      { name: "Marvel Studios", background: "#FF0000" },
      { name: "Disney+", background: "#1e2161" },
      { name: "Netflix", background: "#e6111b" },
      { name: "HBO", background: "#0808ff" },
      { name: "Sony Pictures", background: "#ffff" },
      { name: "Warner Bros. Pictures", background: "#003399" },
      { name: "20th Century Fox", background: "#FFD700" },
      // { name: "Universal", background: "#ffff" },
      // Add more studios as needed
    ],
    []
  );

  useEffect(() => {
    if (!api) return;
    // Only fetch the important studios by name
    Promise.all(
      studios.map(async (studio) => {
        try {
          const res = await api.getStudioByName(studio.name, 1);
          const found = res.Items && res.Items.length > 0 ? res.Items[0] : null;
          return found ? { Name: found.Name, Id: found.Id } : { Name: studio.name, Id: undefined };
        } catch {
          return { Name: studio.name, Id: undefined };
        }
      })
    ).then((results) => {
      setStudioApiList(results.filter((s): s is { Name: string; Id: string } => typeof s.Id === "string"));
    });
  }, [api, studios]);

  function getStudioIdByName(name: string): string | undefined {
    const normalized = name.replace(/[\s.]/g, "").toLowerCase();
    console.log(studioApiList);
    
    const found = studioApiList.find((s) =>
      s.Name.replace(/[\s.]/g, "").toLowerCase().includes(normalized)
    );
    return found?.Id;
  }

  // Dynamically import all PNGs from /src/assets/studios/
  const studioLogoModules = import.meta.glob("../assets/studios/*.png", {
    eager: true,
    as: "url",
  }) as Record<string, string>;

  function getStudioLogo(studioName: string): string | null {
    // Normalize studio name for matching
    const normalized = studioName.replace(/[\s.]/g, "").toLowerCase();
    // Find a logo whose filename includes the normalized studio name
    for (const path in studioLogoModules) {
      const fileName =
        path
          .split("/")
          .pop()
          ?.replace(/[\s.-]/g, "")
          .toLowerCase() || "";
      if (fileName.includes(normalized)) {
        return studioLogoModules[path];
      }
    }
    return null;
  }

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
      <div className="container mx-auto px-4 -mt-16 relative z-10 mt-[20px] sm:mt-[-4rem] mb-16">
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

        {/* Studios Section */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Studios</h2>
          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
            {studios.map((studio) => {
              const logo = getStudioLogo(studio.name);
              const studioId = getStudioIdByName(studio.name);
              return (
                <div
                  key={studio.name}
                  className="rounded-lg flex items-center justify-center w-56 h-28 shadow-md flex-shrink-0 cursor-pointer"
                  style={{ background: studio.background }}
                  title={studio.name}
                  data-studio-id={studioId}
                  onClick={() =>
                    studioId &&
                    navigate({
                      pathname: "/studio",
                      search: createSearchParams({ studioId }).toString(),
                    })
                  }
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt={studio.name}
                      className="max-h-16 max-w-[80%] object-contain"
                    />
                  ) : (
                    <span className="text-neutral-200">{studio.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
