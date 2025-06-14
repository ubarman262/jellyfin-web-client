import { FastForward } from "lucide-react";
import "./style.css";

interface MoreInfoButtonProps {
  readonly onClick: () => void;
  readonly width?: string | number;
  readonly height?: string | number;
}

export default function SkipIntroButton({
  onClick,
  width,
  height,
}: MoreInfoButtonProps) {
  return (
    <button
      className="skipIntro-item"
      onClick={onClick}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    >
      <div
        className="skipIntro-light"
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
          <FastForward size={20} /> Skip Intro
        </span>
      </div>
    </button>
  );
}
