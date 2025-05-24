import React from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

type ProgressiveImageProps = {
  src: string;
};

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ src }) => {
  return <LazyLoadImage alt="trailer" effect="blur" src={src} />;
};

export default ProgressiveImage;
