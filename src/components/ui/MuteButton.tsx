import { Volume2, VolumeX } from "lucide-react";
import { YouTubePlayer } from "react-youtube";

interface PositionProps {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

interface MuteButtonProps {
  readonly trailerStarted: boolean;
  readonly isMuted: boolean;
  readonly player: YouTubePlayer;
  readonly setIsMuted: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void;
  readonly size?: number; // Optional size prop with a default value
  readonly position?: PositionProps; // New optional position prop
}

function MuteButton({
  trailerStarted,
  isMuted,
  player,
  setIsMuted,
  size,
  position
}: MuteButtonProps) {
  // Use inline-flex and remove width/height from style, use only padding for sizing
  return (
    <div>
      {trailerStarted && (
        <button
          className="absolute z-30 bg-transparent rounded-full p-1 ml-1 border-2 flex items-center justify-center"
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
            <VolumeX size={size} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
          ) : (
            <Volume2 size={size} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
          )}
        </button>
      )}
    </div>
  );
}

export default MuteButton;
