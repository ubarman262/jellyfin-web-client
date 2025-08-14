import { Volume2, VolumeX } from "lucide-react";
import { YouTubePlayer } from "react-youtube";
import { isMobile } from "react-device-detect";

interface MuteButtonProps {
  readonly trailerStarted: boolean;
  readonly isMuted: boolean;
  readonly player: YouTubePlayer;
  readonly setIsMuted: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void;
}

function MuteButton({
  trailerStarted,
  isMuted,
  player,
  setIsMuted,
}: MuteButtonProps) {
  // Use inline-flex and remove width/height from style, use only padding for sizing
  return (
    <div>
      {trailerStarted && (
        <button
          className="absolute bottom-14 right-4 z-30 bg-transparent rounded-full p-1 ml-1 border-2 flex items-center justify-center"
          style={{
            borderColor: "rgb(255 255 255 / 32%)",
            // Remove width/height/minWidth/minHeight from here
            display: "inline-flex",
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
            <VolumeX size={14} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
          ) : (
            <Volume2 size={14} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
          )}
        </button>
      )}
    </div>
  );
}

export default MuteButton;
