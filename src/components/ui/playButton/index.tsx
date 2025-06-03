import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useMediaItem } from "../../../hooks/useMediaData";
import "./style.css";

interface PlayButtonProps {
  readonly itemId: string;
  readonly type?: string;
  readonly width?: string | number;
  readonly height?: string | number;
  onBeforePlay?: () => void | Promise<void>; // <-- add this
}

export default function PlayButton(props: Readonly<PlayButtonProps>) {
  const { itemId, type, width, height, onBeforePlay } = props;
  const navigate = useNavigate();
  const { api } = useAuth();
  const { item } = useMediaItem(itemId);
  const [targetId, setTargetId] = useState<string>(itemId);
  const location = useLocation();

  useEffect(() => {
    async function resolveTargetId() {
      if (type !== "Series" || !api || !item) {
        setTargetId(itemId);
        return;
      }

      // 1. Try NextUp
      const nextUp = await api.getSeriesNextUp(item.Id, 1);
      if (Array.isArray(nextUp) && nextUp.length > 0) {
        setTargetId(nextUp[0].Id);
        return;
      }

      // fallback to series id
      setTargetId(item.Id);
    }

    resolveTargetId();
  }, [type, api, item, itemId]);

  const handlePlay = async () => {
    if (onBeforePlay) {
      await onBeforePlay();
    }
    const firstSegment = location.pathname.split("/")[1];
    navigate(`/play/${targetId}`, {
      state: { callbackPath: `/${firstSegment}` },
    });
  };

  return (
    <button
      className="play-item"
      onClick={handlePlay}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    >
      <div
        className="play-light"
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: "100%",
        }}
      >
        <span
          style={{
            width: typeof width === "number" ? `${width}px` : width,
            height: typeof height === "number" ? `${height}px` : height,
          }}
        >
          <i className="fas fa-play"></i>Play
        </span>
      </div>
    </button>
  );
}
