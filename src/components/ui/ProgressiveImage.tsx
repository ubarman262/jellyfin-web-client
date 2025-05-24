import React from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

type ProgressiveImageProps = {
  src: string;
  onLoad: () => void;
};

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ src, onLoad }) => {
  return (
    <LazyLoadImage alt="trailer" effect="blur" src={src} onLoad={onLoad} />
  );
};

export default ProgressiveImage;
