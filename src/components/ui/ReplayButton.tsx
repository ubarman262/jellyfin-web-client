import { RotateCcw } from "lucide-react";
import { YouTubePlayer } from "react-youtube";

interface ReplayButtonProps {
  readonly trailerEnded: boolean;
  readonly player: YouTubePlayer;
  readonly setTrailerEnded: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void;
  readonly setTrailerStarted: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void;
}

export default function ReplayButton({
  trailerEnded,
  setTrailerEnded,
  setTrailerStarted,
  player,
}: ReplayButtonProps) {
  return (
    <div>
      {trailerEnded && (
        <button
          className="absolute bottom-4 right-4 z-30 bg-transparent rounded-full p-2 ml-2 border-2 flex items-center justify-center"
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
          <RotateCcw size={18} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
        </button>
      )}
    </div>
  );
}
