import { Info } from "lucide-react";
import "./style.css";

interface MoreInfoButtonProps {
  readonly onClick: () => void;
  readonly width?: string | number;
  readonly height?: string | number;
}

export default function MoreInfoButton({
  onClick,
  width,
  height,
}: MoreInfoButtonProps) {
  return (
    <button
      className="moreinfo-item"
      onClick={onClick}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    >
      <div
        className="moreinfo-light"
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
          <Info size={20} /> More Info
        </span>
      </div>
    </button>
  );
}
