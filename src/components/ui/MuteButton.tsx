import { Volume2, VolumeX } from "lucide-react";
import { YouTubePlayer } from "react-youtube";

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
  return (
    <div>
      {trailerStarted && (
        <button
          className="absolute bottom-4 right-4 z-30 bg-transparent rounded-full p-2 ml-2 border-2 flex items-center justify-center"
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
            <VolumeX size={18} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
          ) : (
            <Volume2 size={18} strokeWidth={2} color="rgb(255 255 255 / 60%)" />
          )}
        </button>
      )}
    </div>
  );
}

export default MuteButton;
