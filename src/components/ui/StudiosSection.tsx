import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, createSearchParams } from "react-router-dom";

const studios = [
  { name: "Marvel Studios", background: "#FF0000" },
  { name: "Disney+", background: "#1e2161" },
  { name: "Netflix", background: "#e6111b" },
  { name: "HBO", background: "#0808ff" },
  { name: "Sony Pictures", background: "#ffff" },
  { name: "Warner Bros. Pictures", background: "#003399" },
  { name: "20th Century Fox", background: "#FFD700" },
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

  return (
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
  );
};

export default StudiosSection;
