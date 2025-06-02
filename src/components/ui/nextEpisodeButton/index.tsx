import { useEffect, useRef } from "react";
import "./style.css";
import { MediaItem } from "../../../types/jellyfin";

interface NextEpisodeButtonProps {
  readonly nextEpisode: MediaItem;
}

export default function NextEpisodeButton({
  nextEpisode,
}: NextEpisodeButtonProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handler to play next episode and clear timer
  const playNext = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    window.location.href = `/play/${nextEpisode.Id}`;
  };

  useEffect(() => {
    // Start 30s timer on mount
    timerRef.current = setTimeout(() => {
      playNext();
    }, 5000);

    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEpisode.Id]);

  return (
    <div
      className="next-episode"
      onClick={playNext}
      style={{ width: "150px", height: "50px" }}
    >
      <div className="dark">
        <span>
          <i className="fas fa-play"></i>Next
        </span>
      </div>
      <div className="light">
        <span>
          <i className="fas fa-play"></i>Next
        </span>
      </div>
    </div>
  );
}
