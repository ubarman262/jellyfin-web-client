import { RotateCcw } from "lucide-react";
import { YouTubePlayer } from "react-youtube";

interface PositionProps {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

interface ReplayButtonProps {
  readonly trailerEnded: boolean;
  readonly player: YouTubePlayer;
  readonly setTrailerEnded: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void;
  readonly setTrailerStarted: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void;
  readonly size?: number; // Optional size prop with a default value
  readonly position?: PositionProps; // New optional position prop
}

export default function ReplayButton({
  trailerEnded,
  setTrailerEnded,
  setTrailerStarted,
  player,
  size,
  position
}: ReplayButtonProps) {
  return (
    <div>
      {trailerEnded && (
        <button
          className="absolute bottom-4 right-4 z-30 bg-transparent rounded-full p-1 ml-1 border-2 flex items-center justify-center"
          style={{
            borderColor: "rgb(255 255 255 / 32%)",
            display: "inline-flex",
            // Use provided position or default to bottom-4 right-4
            top: position?.top,
            right: position?.right ?? 16,
            bottom: position?.bottom ?? 16,
            left: position?.left,
          }}
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
          <RotateCcw size={size} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
        </button>
      )}
    </div>
  );
}
