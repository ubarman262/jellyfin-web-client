import clsx from "clsx";
import {
  Calendar,
  Check,
  Clock,
  Plus,
  Heart,
  Volume2,
  VolumeX,
  X,
  Star,
  RotateCcw, // Add this import for the replay icon
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { useAuth } from "../../context/AuthContext";
import { useMediaItem } from "../../hooks/useMediaData";
import { People, Studios } from "../../types/jellyfin";
import CastList from "./CastList";
import EpisodesList from "./EpisodesList";
import PlayButton from "./playButton";

interface MediaDetailsModalProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
}

const MediaDetailsModal: React.FC<MediaDetailsModalProps> = ({
  open,
  onClose,
  itemId,
}) => {
  const { api } = useAuth();
  const { item } = useMediaItem(itemId);
  const modalRef = useRef<HTMLDivElement>(null);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [trailerStarted, setTrailerStarted] = useState(false);
  const [trailerEnded, setTrailerEnded] = useState(false);
  const [isWatched, setIsWatched] = useState<boolean>(false);
  const [isFavourite, setIsFavourite] = useState<boolean>(false);

  const isEpisode = item?.Type === "Episode";
  const isMovie = item?.Type === "Movie";
  const isSeries = item?.Type === "Series";

  // Fetch trailer when modal opens
  useEffect(() => {
    setTrailerUrl(null);
    setTrailerStarted(false);
    setTrailerEnded(false);

    const fetchTrailer = async () => {
      if (!open || !item) return;
      if (
        Array.isArray(item.RemoteTrailers) &&
        item.RemoteTrailers.length > 0
      ) {
        const trailer = item.RemoteTrailers[0];
        setTrailerUrl(trailer.Url);
      }
    };

    fetchTrailer();
  }, [open, item]);

  // Close on outside click or Esc
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  useEffect(() => {
    // Sync local watched state with item.UserData?.Played when item changes
    setIsWatched(!!item?.UserData?.Played);
    setIsFavourite(!!item?.UserData?.IsFavorite);
  }, [item]);

  if (!open || !item || !api) return null;

  // Helper to extract YouTube video ID from URL
  function getYouTubeId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com")) {
        return u.searchParams.get("v");
      }
      if (u.hostname === "youtu.be") {
        return u.pathname.replace("/", "");
      }
      return null;
    } catch {
      return null;
    }
  }

  const youtubeId = trailerUrl ? getYouTubeId(trailerUrl) : null;
  console.log(youtubeId);

  // Use series backdrop for episodes, otherwise use item's own backdrop
  let backdropUrl = "";
  if (isEpisode && item.SeriesId) {
    backdropUrl = api.getImageUrl(item.SeriesId, "Backdrop", 1280);
  } else if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {
    backdropUrl = api.getImageUrl(item.Id, "Backdrop", 1280);
  }

  // Format runtime from ticks to minutes
  const formatRuntime = (ticks?: number) => {
    if (!ticks) return "";
    const totalMinutes = Math.floor(ticks / (10000 * 1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get director(s)
  const directors =
    Array.isArray(item.People) &&
    item.People.filter((p: People) => p.Type === "Director").map((p) => p.Name);

  // Get writers
  const writers =
    Array.isArray(item.People) &&
    item.People.filter((p: People) => p.Type === "Writer").map((p) => p.Name);

  // Get studios
  const studios =
    item.Studios && item.Studios.length > 0
      ? item.Studios.map((s: Studios) => s.Name)
      : [];

  return (
    // <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80">
    <div
      ref={modalRef}
      className={clsx(
        "relative bg-neutral-900 rounded-t-xl shadow-2xl w-full max-w-4xl mx-auto overflow-y-auto scrollbar-hide",
        "max-h-screen"
      )}
      style={{ maxHeight: 700, marginBottom: 0 }}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-30 bg-black/60 rounded-full p-2 hover:bg-black/80 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={24} />
      </button>

      {/* Trailer/Backdrop area */}
      <div className="relative w-full aspect-[16/8] bg-black rounded-t-lg overflow-hidden">
        {/* Backdrop image base */}
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={item.Name}
            className={clsx(
              "w-full h-full object-cover absolute inset-0 transition-opacity duration-700",
              trailerStarted && !trailerEnded ? "opacity-0" : "opacity-100"
            )}
            style={{ objectFit: "cover", zIndex: 1 }}
          />
        )}

        {/* Trailer video, only show if not ended */}
        {youtubeId && !trailerEnded && (
          <YouTube
            style={{
              width: "100vw",
              height: "100vh",
              minWidth: "100%",
              minHeight: "100%",
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) scale(1)",
              pointerEvents: "auto",
            }}
            videoId={youtubeId}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                fs: 0,
                disablekb: 1,
                iv_load_policy: 3,
                playsinline: 1,
                start: 6,
              },
            }}
            className="w-full h-full"
            iframeClassName="w-full h-full"
            onReady={(e) => {
              setPlayer(e.target);
              try {
                e.target.setPlaybackQuality("hd1080");
                if (isMuted) e.target.mute();
                else e.target.unMute();
              } catch {}
            }}
            onPlay={() => {
              setTrailerStarted(true);
              setTrailerEnded(false);
            }}
            onEnd={() => {
              setTrailerEnded(true);
              setTrailerStarted(false);
            }}
          />
        )}

        {/* Mute and Replay trailer buttons */}
        {trailerStarted && (
          <button
            className="absolute bottom-4 right-8 z-30 bg-transparent rounded-full p-2 ml-2 border-2 flex items-center justify-center"
            style={{ borderColor: "rgb(255 255 255 / 32%)" }}
            onClick={() => {
              setIsMuted((prev) => {
                if (player) {
                  if (!prev) player.mute();
                  else player.unMute();
                }
                return !prev;
              });
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
            type="button"
          >
            {isMuted ? (
              <VolumeX
                size={18}
                strokeWidth={2}
                color="rgb(255 255 255 / 60%)"
              />
            ) : (
              <Volume2
                size={18}
                strokeWidth={2}
                color="rgb(255 255 255 / 60%)"
              />
            )}
          </button>
        )}
        {/* Replay trailer button */}
        {trailerEnded && (
          <button
            className="absolute bottom-4 right-8 z-30 bg-transparent rounded-full p-2 ml-2 border-2 flex items-center justify-center"
            style={{ borderColor: "rgb(255 255 255 / 32%)" }}
            onClick={() => {
              setTrailerEnded(false);
              setTrailerStarted(false);
              // Seek to 0 and play again if player is available
              if (player && typeof player.seekTo === "function") {
                player.seekTo(0);
                player.playVideo();
              }
            }}
            aria-label="Replay Trailer"
            type="button"
          >
            <RotateCcw
              size={18}
              strokeWidth={2}
              color="rgb(255 255 255 / 60%)"
            />
          </button>
        )}

        {/* Play button over video, bottom left */}
        <div className="absolute bottom-2 left-4 z-30 flex items-center gap-2 ml-4">
          <PlayButton
            itemId={item.Id}
            type={item.Type}
            width={200}
            height={50}
          />
          {/* Watched checkmark with transition */}
          <span
            className="relative bg-white/10 rounded-full p-2 ml-2 border-2 border-white flex items-center justify-center cursor-pointer"
            title={isWatched ? "Mark as unwatched" : "Mark as watched"}
            style={{
              lineHeight: 0,
              width: 44,
              height: 44,
              transition: "background 0.2s",
            }}
            onClick={async () => {
              if (!isWatched) {
                try {
                  await api.markItemPlayed(item.Id);
                  setIsWatched(true);
                } catch (err) {
                  console.error("Error marking as watched:", err);
                }
              } else {
                try {
                  await api.markItemUnplayed(item.Id);
                  setIsWatched(false);
                } catch (err) {
                  console.error("Error marking as unwatched:", err);
                }
              }
            }}
          >
            {/* Plus icon */}
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isWatched ? 0 : 1,
                transform: isWatched ? "scale(0.7)" : "scale(1)",
                transition: "opacity 0.25s, transform 0.25s",
                pointerEvents: isWatched ? "none" : "auto",
              }}
            >
              <Plus size={22} />
            </span>
            {/* Check icon */}
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isWatched ? 1 : 0,
                transform: isWatched ? "scale(1)" : "scale(0.7)",
                transition: "opacity 0.25s, transform 0.25s",
                pointerEvents: isWatched ? "auto" : "none",
              }}
            >
              <Check size={22} />
            </span>
          </span>
          {/* Favourite button with transition */}
          <span
            className="relative bg-white/10 rounded-full p-2 ml-2 border-2 border-white flex items-center justify-center cursor-pointer"
            title={isFavourite ? "Remove from favorites" : "Add to favorites"}
            style={{
              lineHeight: 0,
              width: 44,
              height: 44,
              transition: "background 0.2s",
            }}
            onClick={async () => {
              try {
                await api.markAsFavourite(item.Id, !isFavourite);
                setIsFavourite((prev) => !prev);
              } catch (err) {
                console.error("Error toggling favorite:", err);
              }
            }}
          >
            {/* Outlined Heart icon */}
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isFavourite ? 0 : 1,
                transform: isFavourite ? "scale(0.7)" : "scale(1)",
                transition: "opacity 0.25s, transform 0.25s",
                // color: "#facc15",
                pointerEvents: isFavourite ? "none" : "auto",
              }}
            >
              <Heart size={22} />
            </span>
            {/* Filled Heart icon */}
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isFavourite ? 1 : 0,
                transform: isFavourite ? "scale(1)" : "scale(0.7)",
                transition: "opacity 0.25s, transform 0.25s",
                // color: "#facc15",
                pointerEvents: isFavourite ? "auto" : "none",
              }}
            >
              <Heart size={22} fill="#fff" />
            </span>
          </span>
        </div>

        {/* Fade overlay between video and details */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(23,23,23,0) 0%, #171717 90%)",
            zIndex: 10,
          }}
        />
      </div>

      {/* Details */}
      <div className="relative p-8 pt-6 bg-neutral-900 rounded-b-lg">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column: text details */}
          <div className="flex-1 min-w-0">
            {/* Title and episode info */}
            {isEpisode ? (
              <>
                <div className="text-3xl md:text-4xl font-bold mb-0">
                  <span className="text-white">{item.SeriesName}</span>
                </div>
                <div className="text-base font-semibold text-white mt-1 mb-2">
                  {item.ParentIndexNumber !== undefined &&
                  item.IndexNumber !== undefined ? (
                    <>
                      Season {item.ParentIndexNumber} - {item.IndexNumber}.{" "}
                      {item.Name}
                    </>
                  ) : (
                    item.Name
                  )}
                </div>
              </>
            ) : (
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                {item.Name}
              </h2>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 mb-2">
              {isEpisode && item.PremiereDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={16} />
                  {new Date(item.PremiereDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                  })}
                </span>
              )}
              {item.ProductionYear && !isEpisode && (
                <span className="flex items-center gap-1">
                  <Calendar size={16} />
                  {item.ProductionYear}
                </span>
              )}
              {item.RunTimeTicks && (
                <span className="flex items-center gap-1">
                  <Clock size={16} />
                  {isEpisode
                    ? `${Math.round(item.RunTimeTicks / 600000000)}m`
                    : formatRuntime(item.RunTimeTicks)}
                </span>
              )}
              {item.OfficialRating && (
                <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">
                  {item.OfficialRating}
                </span>
              )}
              {item.CommunityRating && (
                <span className="flex items-center gap-1">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  {item.CommunityRating.toFixed(1)}
                </span>
              )}
            </div>
            {item.Genres && item.Genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {item.Genres.slice(0, 4).map((genre, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            <p className="text-gray-200 mb-4">{item.Overview}</p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-2">
              {directors && directors.length > 0 && (
                <div>
                  <span className="font-semibold text-white">Director:</span>{" "}
                  {directors.join(", ")}
                </div>
              )}
              {writers && writers.length > 0 && (
                <div>
                  <span className="font-semibold text-white">Writers:</span>{" "}
                  {writers.join(", ")}
                </div>
              )}
              {studios && studios.length > 0 && (
                <div>
                  <span className="font-semibold text-white">Studios:</span>{" "}
                  {studios.join(", ")}
                </div>
              )}
            </div>
          </div>
          {/* Right column: CastList */}
          {item.People && item.People.length > 0 && (
            <div className="md:w-1/3 w-full mb-4 md:mb-0">
              <CastList people={item.People} />
            </div>
          )}
        </div>

        {/* Episodes list below both columns */}
        {isSeries && (
          <div className="mt-8">
            <EpisodesList seriesId={item.Id} />
          </div>
        )}
        {isEpisode && item.SeasonId && (
          <div className="mt-8">
            <EpisodesList seriesId={item.SeriesId ?? item.SeasonId} />
          </div>
        )}
      </div>
    </div>
    // </div>
  );
};

export default MediaDetailsModal;
