import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type Episode = {
  Id: string;
  Name: string;
  RunTimeTicks?: number;
  PremiereDate?: string;
  CommunityRating?: number;
  UserData?: {
    Played?: boolean;
  };
  ImageTags?: {
    Primary?: string;
  };
  ParentIndexNumber?: number;
  IndexNumber?: number;
  Overview?: string;
};

interface EpisodesListProps {
  readonly episodes: readonly Episode[];
}

export default function EpisodesList({ episodes }: EpisodesListProps) {
  const { api } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="divide-y divide-[#232323] border border-[#232323] rounded-xl overflow-hidden mb-10">
      {episodes.map((ep) => {
        // Calculate runtime in h m format
        let runtime = "";
        if (ep.RunTimeTicks) {
          const totalMinutes = Math.floor(
            ep.RunTimeTicks / (10000 * 1000 * 60)
          );
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }

        // Watched
        const watched = ep.UserData?.Played;
        return (
          <div
            key={ep.Id}
            className="flex flex-row gap-4 items-center group hover:bg-[#232323] transition px-4 py-3"
          >
            {/* Thumbnail */}
            <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden group cursor-pointer">
              <img
                src={
                  ep.ImageTags?.Primary && api
                    ? api.getImageUrl(ep.Id, "Primary", 400)
                    : ""
                }
                alt={ep.Name}
                className="w-full h-full object-cover"
                onClick={() => navigate(`/play/${ep.Id}`)}
                style={{ cursor: "pointer" }}
              />
              {/* Watched checkmark */}
            </div>
            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">
                  {ep.Name}
                </span>
                {ep.ParentIndexNumber !== undefined &&
                  ep.IndexNumber !== undefined && (
                    <span className="text-xs text-gray-400">
                      EPISODE {ep.IndexNumber}
                    </span>
                  )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-1">
                {runtime && <span>{runtime}</span>}

                {ep.PremiereDate && (
                  <span>
                    {new Date(ep.PremiereDate).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
              {/* Episode synopsis */}
              {ep.Overview && (
                <div className="text-gray-400 text-xs mt-1 line-clamp-2">
                  {ep.Overview}
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="flex flex-col gap-2 ml-4">
              {/* Watched/Unwatched toggle */}
              {watched ? (
                <span className="text-red-500" title="Watched">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              ) : (
                <></>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
