import { Check, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MediaItem } from "../../types/jellyfin";

interface MarkWatchedButtonProps {
  readonly item: MediaItem;
  readonly isWatched: boolean;
  readonly setIsWatched: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void;
}

export default function MarkWatchedButton({
  item,
  isWatched,
  setIsWatched,
}: MarkWatchedButtonProps) {
  const { api } = useAuth();

  if (!api) return null;

  return (
    <div>
      <span
        className="relative bg-white/10 rounded-full p-2 ml-4 border-2 border-white flex items-center justify-center cursor-pointer"
        title={isWatched ? "Mark as unwatched" : "Mark as watched"}
        style={{
          lineHeight: 0,
          width: 37.2,
          height: 37.2,
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
          <Plus size={18} />
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
          <Check size={18} />
        </span>
      </span>
    </div>
  );
}
