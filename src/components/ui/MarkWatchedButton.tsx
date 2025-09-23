import { Check, Plus } from "lucide-react";
import { CSSProperties } from "react";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";

interface MarkWatchedButtonProps {
  readonly item: MediaItem;
  readonly isWatched: boolean;
  readonly setIsWatched: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly iconSize?: number;
}

export default function MarkWatchedButton({
  item,
  isWatched,
  setIsWatched,
  className,
  style,
  iconSize = 18,
}: MarkWatchedButtonProps) {
  const { api } = useAuth();

  if (!api) return null;

  const defaultStyle: CSSProperties = {
    lineHeight: 0,
    width: 37.2,
    height: 37.2,
    transition: "background 0.2s",
  };

  const combinedStyle = { ...defaultStyle, ...style };

  // Use custom className if provided, otherwise use default classes
  const buttonClasses = className || "relative bg-white/10 rounded-full p-2 ml-4 border-2 border-white flex items-center justify-center cursor-pointer";

  return (
    <div>
      <span
        className={buttonClasses}
        title={isWatched ? "Mark as unwatched" : "Mark as watched"}
        style={combinedStyle}
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
          <Plus size={iconSize} />
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
          <Check size={iconSize} />
        </span>
      </span>
    </div>
  );
}
