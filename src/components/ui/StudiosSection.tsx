import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, createSearchParams } from "react-router-dom";
import MediaRowNavigation from "./MediaRowNavigation";

const studios = [
  { name: "Marvel Studios", background: "#FF0000" },
  { name: "DC Films", background: "#0377f2" },
  { name: "Disney+", background: "#1e2161" },
  { name: "Apple TV+", background: "#2d2d2d" },
  { name: "Prime Video", background: "#117dff" },
  { name: "Netflix", background: "#e6111b" },
  { name: "HBO", background: "#0808ff" },
  { name: "Sony Pictures", background: "#ffff" },
  { name: "Warner Bros. Pictures", background: "#003399" },
  { name: "20th Century Fox", background: "#d7b853" },
  // Add more studios as needed
];

const studioLogoModules = import.meta.glob("../../assets/studios/*.png", {
  eager: true,
  as: "url",
});

const StudiosSection: React.FC = () => {
  const { api } = useAuth();
  const [studioApiList, setStudioApiList] = useState<{ Name: string; Id: string }[]>([]);
  const navigate = useNavigate();
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    if (!api) return;
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
  }, [api]);

  function getStudioIdByName(name: string): string | undefined {
    const normalized = name.replace(/[\s.]/g, "").toLowerCase();
    const found = studioApiList.find((s) =>
      s.Name.replace(/[\s.]/g, "").toLowerCase().includes(normalized)
    );
    return found?.Id;
  }

  function getStudioLogo(studioName: string): string | null {
    const normalized = studioName.replace(/[\s.]/g, "").toLowerCase();
    for (const path in studioLogoModules) {
      const fileName =
        path
          .split("/")
          .pop()
          ?.replace(/[\s.-]/g, "")
          .toLowerCase() ?? "";
      if (fileName.includes(normalized)) {
        return studioLogoModules[path];
      }
    }
    return null;
  }

  const checkArrows = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    const maxScrollLeft = scrollWidth - clientWidth;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < maxScrollLeft - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    setIsScrolling(true);
    const { clientWidth } = rowRef.current;
    const scrollAmount = clientWidth * 0.9;
    const scrollPos =
      direction === "left"
        ? rowRef.current.scrollLeft - scrollAmount
        : rowRef.current.scrollLeft + scrollAmount;
    rowRef.current.scrollTo({
      left: scrollPos,
      behavior: "smooth",
    });
    setTimeout(() => {
      setIsScrolling(false);
      checkArrows();
    }, 500);
  };

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Studios</h2>
      <div className="relative group/row">
        <div
          ref={rowRef}
          className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide"
          onScroll={checkArrows}
        >
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
        <MediaRowNavigation
          showLeftArrow={showLeftArrow}
          showRightArrow={showRightArrow}
          isScrolling={isScrolling}
          onScrollLeft={() => scroll("left")}
          onScrollRight={() => scroll("right")}
          itemsLength={studios.length}
        />
      </div>
    </div>
  );
};

export default StudiosSection;
