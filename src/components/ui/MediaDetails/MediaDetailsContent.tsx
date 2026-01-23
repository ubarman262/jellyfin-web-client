import React from "react";
import { MediaItem } from "../../../types/jellyfin";
import { sortSeasons, typeEpisode, typeSeries } from "../../../utils/items";
import CastList from "../CastList";
import EpisodesList from "../EpisodesList";

interface MediaDetailsContentProps {
  item: MediaItem;
  seasons: MediaItem[];
  seasonsLoading: boolean;
  selectedSeasonId: string | null;
  onSeasonChange: (seasonId: string) => void;
}

const MediaDetailsContent: React.FC<MediaDetailsContentProps> = ({
  item,
  seasons,
  seasonsLoading,
  selectedSeasonId,
  onSeasonChange
}) => {
  const isSeries = typeSeries(item);
  const isEpisode = typeEpisode(item);
  const showSeasons = (isSeries || isEpisode) && seasons.length > 0;

  return (
    <div className="px-14 pb-16 space-y-8">
      {/* Cast */}
      {item.People && item.People.length > 0 && (
        <CastList people={item.People} />
      )}

      {/* Episodes/Seasons */}
      {showSeasons && !seasonsLoading && (
        <div>
          {seasons.length > 1 && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-white">Seasons</h2>
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {sortSeasons(seasons)
                  .map((season) => (
                    <button
                      key={season.Id}
                      onClick={() => onSeasonChange(season.Id)}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                        selectedSeasonId === season.Id
                          ? "bg-red-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {season.Name}
                    </button>
                  ))}
              </div>
            </>
          )}

          {selectedSeasonId && (
            <EpisodesList
              seriesId={isEpisode ? item.SeriesId ?? "" : item.Id}
              initialSeasonId={selectedSeasonId}
            />
          )}
        </div>
      )}

      {seasonsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      )}
    </div>
  );
};

export default MediaDetailsContent;