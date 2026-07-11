import { useEffect, useState, useImperativeHandle } from "react";
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
import { decode } from "blurhash";

interface ButtonPositionProps {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

interface YouTubeWithProgressiveFallbackProps {
  item: MediaItem | null;
  buttonSize?: number;
  aspectRatio?: "16/9" | "21/9" | "4/3";
  buttonPosition?: ButtonPositionProps;
  isFullyOpen?: boolean;
  playerRef?: React.Ref<{ play: () => void; pause: () => void }>;
}

const YouTubeWithProgressiveFallback = ({
  item,
  buttonSize = 24,
  aspectRatio = "16/9",
  buttonPosition,
  isFullyOpen = true,
  playerRef,
}: YouTubeWithProgressiveFallbackProps) => {
  const { api } = useAuth();
  const [isMuted, setIsMuted] = useState(true);
  const [trailerUrls, setTrailerUrls] = useState<string[]>([]);
  const [currentTrailerIndex, setCurrentTrailerIndex] = useState(0);
  const [player, setPlayer] = useState<YouTubePlayer>(null);
  const [backdropUrl, setBackdropUrl] = useState("");
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [trailerStarted, setTrailerStarted] = useState(false);
  const [trailerEnded, setTrailerEnded] = useState(false);

  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    const currentItem = item;
    const backdropTag =
      currentItem.BackdropImageTags?.[0] ??
      currentItem.ParentBackdropImageTags?.[0];

    if (backdropTag) {
      const blurHash = currentItem.ImageBlurHashes?.Backdrop?.[backdropTag];
      if (blurHash) {
        try {
          const width = 32;
          const height = 18;
          const pixels = decode(blurHash, width, height);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const imageData = ctx.createImageData(width, height);
            imageData.data.set(pixels);
            ctx.putImageData(imageData, 0, 0);
            setBlurDataUrl(canvas.toDataURL());
          }
        } catch {
          setBlurDataUrl(null);
        }
      }
    }
  }, [item]);

  useImperativeHandle(
    playerRef,
    () => ({
      play: () => {
        try {
          if (player && typeof player.playVideo === "function")
            player.playVideo();
        } catch (error) {
          console.error("Error playing YouTube video:", error);
        }
      },
      pause: () => {
        try {
          if (player && typeof player.pauseVideo === "function")
            player.pauseVideo();
        } catch (error) {
          console.error("Error pausing YouTube video:", error);
        }
      },
    }),
    [player],
  );

  useEffect(() => {
    const fetchAndSetTrailer = async () => {
      setTrailerUrls([]);
      setCurrentTrailerIndex(0);
      setTrailerStarted(false);
      setTrailerEnded(false);
      setBackdropLoaded(false);

      if (!item) return;

      const urls = await fetchTrailerUrl(item, api);

      setTrailerUrls(urls || []);
    };

    const fetchBackdropUrl = async () => {
      if (!api || !item) return;
      const backdrop = getBackdropUrl(api, item);
      setBackdropUrl(backdrop);
    };

    fetchAndSetTrailer();
    fetchBackdropUrl();
  }, [item, api, setTrailerStarted, setTrailerEnded]);

  if (!item || !api) return null;

  const trailerUrl = trailerUrls[currentTrailerIndex] || null;
  const youtubeId = getYouTubeId(trailerUrl);

  const handleBackdropLoad = () => {
    setBackdropLoaded(true);
  };

  return (
    <div
      className={`relative w-full aspect-[${aspectRatio}] bg-black rounded-t-xl overflow-hidden`}
    >
      {/* Local Placeholder Image (Stage 1) */}
      {/* Backdrop image base */}
      {backdropUrl && (
        <div
          className={clsx(
            "w-full h-full object-cover absolute inset-0 transition-opacity duration-700",
            trailerStarted && !trailerEnded ? "opacity-0" : "opacity-100",
          )}
          // style={{ objectFit: "cover", zIndex: 1 }}
          style={{
            backgroundImage: blurDataUrl ? `url(${blurDataUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            objectFit: "cover",
            zIndex: 1,
          }}
        >
          <ProgressiveImage src={backdropUrl} onLoad={handleBackdropLoad} />
        </div>
      )}
      {youtubeId && !trailerEnded && backdropLoaded && isFullyOpen && (
        <YouTube
          style={{
            position: "absolute",
            pointerEvents: "none",
            transform: "scale(1.35)",
            opacity: trailerStarted ? 1 : 0,
            transition: "opacity 0.7s ease-in-out",
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
              mute: 1,
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
          onPlay={(e: YouTubeEvent) => {
            const duration = e.target.getDuration();
            if (duration && duration < 5 && currentTrailerIndex < trailerUrls.length - 1) {
              // Video is too short (likely an error or short bumper), load next video
              setCurrentTrailerIndex(prev => prev + 1);
              return;
            }

            // Delay showing the video to ensure any native YouTube UI flashes (like the center pause/play button) have disappeared
            setTimeout(() => {
              setTrailerStarted(true);
            }, 600);
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
        size={buttonSize}
        position={buttonPosition}
      />

      <ReplayButton
        trailerEnded={trailerEnded}
        player={player}
        setTrailerEnded={setTrailerEnded}
        setTrailerStarted={setTrailerStarted}
        size={buttonSize}
        position={buttonPosition}
      />
    </div>
  );
};

export default YouTubeWithProgressiveFallback;
