import React from "react";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";

interface SeriesDetailsSectionProps {
  item: MediaItem;
  seriesDetails: MediaItem | null;
  onSelectSeries: (seriesId: string) => void;
}

const SeriesDetailsSection: React.FC<SeriesDetailsSectionProps> = ({
  item,
  seriesDetails,
  onSelectSeries,
}) => {
  const { api } = useAuth();
  if (!api || !item || (!item.SeriesId && !item.SeriesName)) {
    return null;
  }

  const seriesId = item.SeriesId;
  const seriesName = seriesDetails?.Name ?? item.SeriesName ?? item.Name ?? "";
  const seriesOverview = seriesDetails?.Overview ?? "";
  const year = seriesDetails?.ProductionYear;
  const rating = seriesDetails?.OfficialRating;
  const imageUrl =
    api && seriesDetails?.Id && seriesDetails?.ImageTags?.Primary
      ? api.getImageUrl(seriesDetails.Id, "Primary", 280)
      : "";

  return (
    <div>
      <h3 className="mt-10 text-xl font-semibold text-white mb-4">
        About the Series
      </h3>
      <div className="rounded-xl border border-white/10 bg-[#1f2124]/80 p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="w-full md:w-[160px]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={seriesName || "Series"}
                className="w-full aspect-[2/3] rounded-lg object-cover bg-neutral-800"
              />
            ) : (
              <div className="w-full aspect-[2/3] rounded-lg bg-neutral-800 flex items-center justify-center text-xs text-gray-400">
                No artwork
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              className="text-left text-lg md:text-xl font-semibold text-white hover:text-red-400 transition-colors"
              onClick={() => seriesId && onSelectSeries(seriesId)}
            >
              {seriesName}
            </button>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 mt-2">
              {year && <span>{year}</span>}
              {rating && (
                <span className="px-2 py-0.5 bg-gray-800 rounded">
                  {rating}
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm mt-3 line-clamp-4">
              {seriesOverview || "No overview available."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesDetailsSection;
