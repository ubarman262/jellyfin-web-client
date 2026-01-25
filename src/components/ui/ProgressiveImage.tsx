import React from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { MediaItem } from "../../types/jellyfin";

type ProgressiveImageProps = {
  item: MediaItem;
  src: string;
  onLoad: () => void;
};

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  onLoad,
}) => {
  return (
    <LazyLoadImage
      alt="trailer"
      src={src}
      onLoad={onLoad}
      width="100%"
      effect="blur"
      style={{ objectFit: "cover" }}
    />
  );
};

export default ProgressiveImage;
