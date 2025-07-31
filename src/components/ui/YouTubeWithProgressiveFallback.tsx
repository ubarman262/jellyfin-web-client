import { useEffect, useState } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";

import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";
import {
  fetchTrailerUrl,
  getBackdropUrl,
  getYouTubeId,
} from "../../utils/items";
import MuteButton from "./MuteButton";
import ProgressiveImage from "./ProgressiveImage";
import ReplayButton from "./ReplayButton";

interface YouTubeWithProgressiveFallbackProps {
  item: MediaItem;
}

const YouTubeWithProgressiveFallback = ({
  item,
}: YouTubeWithProgressiveFallbackProps) => {
  const { api } = useAuth();
  const [isMuted, setIsMuted] = useState(true);
  const [trailerStarted, setTrailerStarted] = useState(false);
  const [trailerEnded, setTrailerEnded] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [player, setPlayer] = useState<YouTubePlayer>(null);
  const [backdropUrl, setBackdropUrl] = useState("");
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  
  useEffect(() => {
    const fetchAndSetTrailer = async () => {
      setTrailerUrl(null);
      setTrailerStarted(false);
      setTrailerEnded(false);
      setBackdropLoaded(false);

      if (!open || !item) return;

      const url = await fetchTrailerUrl(item, api);
      setTrailerUrl(url);
    };

    const fetchBackdropUrl = async () => {
      if (!api) return;
      const backdrop = getBackdropUrl(api, item);
      setBackdropUrl(backdrop);
    };

    fetchAndSetTrailer();
    fetchBackdropUrl();
  }, [item, api]);

  if (!item || !api) return null;

  const youtubeId = getYouTubeId(trailerUrl);

  const handleBackdropLoad = () => {
    setBackdropLoaded(true);
  };

  return (
    <div className="relative w-full aspect-[16/8] bg-black rounded-t-xl overflow-hidden">
      {/* Local Placeholder Image (Stage 1) */}
      {/* Backdrop image base */}
      {backdropUrl && (
        <div
          className={clsx(
            "w-full h-full object-cover absolute inset-0 transition-opacity duration-700",
            trailerStarted && !trailerEnded ? "opacity-0" : "opacity-100"
          )}
          style={{ objectFit: "cover", zIndex: 1 }}
        >
          <ProgressiveImage src={backdropUrl} onLoad={handleBackdropLoad} />
        </div>
      )}
      {youtubeId && !trailerEnded && backdropLoaded && (
        <YouTube
          style={{
            // width: "100vw",
            // height: "100vh",
            // minWidth: "100%",
            // minHeight: "100%",
            position: "absolute",
            top: "44%",
            left: "50%",
            transform: "translate(-50%, -50%) scale(1.2)",
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
              mute: 1
            },
          }}
          className="w-full h-full"
          iframeClassName="w-full h-full"
          onReady={(e: YouTubeEvent) => {
            setPlayer(e.target);
            try {
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
      <MuteButton
        trailerStarted={trailerStarted}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        player={player}
      />

      <ReplayButton
        trailerEnded={trailerEnded}
        player={player}
        setTrailerEnded={setTrailerEnded}
        setTrailerStarted={setTrailerStarted}
      />
    </div>
  );
};

export default YouTubeWithProgressiveFallback;
