import clsx from "clsx";
import { Calendar, Clock, Heart, Star, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Sheet } from "react-modal-sheet";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useAuth } from "../../context/AuthContext";
import { useMediaItem } from "../../hooks/useMediaData";
import { formatRuntime } from "../../utils/formatters";
import {
  fetchTrailerUrl,
  getBackdropUrl,
  getDirectors,
  getStudios,
  getWriters,
  getYouTubeId,
  typeEpisode,
  typeSeries,
} from "../../utils/items";
import CastList from "./CastList";
import EpisodesList from "./EpisodesList";
import MarkWatchedButton from "./MarkWatchedButton";
import MuteButton from "./MuteButton";
import PlayButton from "./playButton";
import ReplayButton from "./ReplayButton";
import ImageWithFallback from "./ImageWithFallback";

interface MediaDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
}

const MediaDetailsDrawer: React.FC<MediaDetailsDrawerProps> = ({
  open,
  onClose,
  itemId,
}) => {
  const { api } = useAuth();
  const { item } = useMediaItem(itemId);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [player, setPlayer] = useState<YouTubePlayer>(null);
  const [trailerStarted, setTrailerStarted] = useState(false);
  const [trailerEnded, setTrailerEnded] = useState(false);
  const [isWatched, setIsWatched] = useState<boolean>(false);
  const [isFavourite, setIsFavourite] = useState<boolean>(false);

  const videoQuality = "hd1080"; // Set the desired video quality

  const isEpisode = typeEpisode(item);
  const isSeries = typeSeries(item);

  // Fetch trailer when modal opens
  useEffect(() => {
    const fetchAndSetTrailer = async () => {
      setTrailerUrl(null);
      setTrailerStarted(false);
      setTrailerEnded(false);

      if (!open || !item) return;

      const url = await fetchTrailerUrl(item, api);
      setTrailerUrl(url);
    };

    fetchAndSetTrailer();
  }, [open, item, api]);

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        setTimeout(() => {
          document.body.style.overflow = original;
        }, 300);
      };
    }
  }, [open]);

  useEffect(() => {
    // Sync local watched state with item.UserData?.Played when item changes
    setIsWatched(!!item?.UserData?.Played);
    setIsFavourite(!!item?.UserData?.IsFavorite);
  }, [item]);

  if (!item || !api) return null;

  const youtubeId = getYouTubeId(trailerUrl);

  // Use series backdrop for episodes, otherwise use item's own backdrop
  const backdropUrl = getBackdropUrl(api, item);

  // Get director(s)
  const directors = getDirectors(item);

  // Get writers
  const writers = getWriters(item);

  // Get studios
  const studios = getStudios(item);

  return (
    <Sheet
      isOpen={open}
      onClose={onClose}
      disableDrag={false}
      disableScrollLocking={true}
      className="w-full max-w-4xl mx-auto"
    >
      <Sheet.Container
        className="!bg-neutral-900"
        style={{
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "12px",
          transitionDuration: "100ms",
        }}
      >
        <Sheet.Content>
          <div className="rounded-t-xl overflow-y-auto scrollbar-hide">
            {/* Close button */}
            <button
              className="absolute top-4 right-4 z-30 bg-black/30 border-2 rounded-full p-2 hover:bg-black/50 transition-colors"
              style={{ borderColor: "rgb(255 255 255 / 32%)" }}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
            </button>

            {/* Trailer/Backdrop area */}
            <div className="relative w-full aspect-[16/8] bg-black rounded-t-xl overflow-hidden">
              {/* Backdrop image base */}
              {backdropUrl && (
                <ImageWithFallback
                  src={backdropUrl}
                  alt={item.Name}
                  className={clsx(
                    "w-full h-full object-cover absolute inset-0 transition-opacity duration-700",
                    trailerStarted && !trailerEnded
                      ? "opacity-0"
                      : "opacity-100"
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
                      vq: { videoQuality },
                    },
                  }}
                  className="w-full h-full"
                  iframeClassName="w-full h-full"
                  onReady={(e: YouTubeEvent) => {
                    setPlayer(e.target);
                    try {
                      e.target.setPlaybackQuality(videoQuality);
                      if (isMuted) e.target.mute();
                      else e.target.unMute();
                    } catch (err) {
                      console.error("Error setting playback quality:", err);
                    }
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
              <MuteButton
                trailerStarted={trailerStarted}
                isMuted={isMuted}
                setIsMuted={setIsMuted}
                player={player}
              />

              {/* Replay trailer button */}
              <ReplayButton
                trailerEnded={trailerEnded}
                player={player}
                setTrailerEnded={setTrailerEnded}
                setTrailerStarted={setTrailerStarted}
              />

              {/* Play button over video, bottom left */}
              <div className="absolute bottom-2 left-4 z-30 flex items-center gap-2 ml-4">
                <PlayButton
                  itemId={item.Id}
                  type={item.Type}
                  width={200}
                  height={50}
                />
                {/* Watched checkmark with transition */}
                <MarkWatchedButton
                  item={item}
                  isWatched={isWatched}
                  setIsWatched={setIsWatched}
                />
                {/* Favourite button with transition */}
                <span
                  className="relative bg-white/10 rounded-full p-2 ml-2 border-2 border-white flex items-center justify-center cursor-pointer"
                  title={
                    isFavourite ? "Remove from favorites" : "Add to favorites"
                  }
                  style={{
                    lineHeight: 0,
                    width: 37.2,
                    height: 37.2,
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
                    <Heart size={18} />
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
                    <Heart size={18} fill="#fff" />
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
                            Season {item.ParentIndexNumber} - {item.IndexNumber}
                            . {item.Name}
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
                        {new Date(item.PremiereDate).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                          }
                        )}
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
                        <Star
                          size={16}
                          className="text-yellow-500 fill-yellow-500"
                        />
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
                        <span className="font-semibold text-white">
                          Director:
                        </span>{" "}
                        {directors.join(", ")}
                      </div>
                    )}
                    {writers && writers.length > 0 && (
                      <div>
                        <span className="font-semibold text-white">
                          Writers:
                        </span>{" "}
                        {writers.join(", ")}
                      </div>
                    )}
                    {studios && studios.length > 0 && (
                      <div>
                        <span className="font-semibold text-white">
                          Studios:
                        </span>{" "}
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
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={onClose}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.82)",
        }}
      />
    </Sheet>
  );
};

export default MediaDetailsDrawer;
