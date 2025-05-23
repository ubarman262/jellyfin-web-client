import React, { useState } from "react";
import FallbackImage from "../../assets/gif/backdrop_fallback.gif";

type FallbackImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fallback?: string;
};

const ImageWithFallback: React.FC<FallbackImageProps> = ({
  src,
  fallback = FallbackImage,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <img
      src={imgSrc}
      alt="ImageWithFallback"
      onError={() => setImgSrc(fallback)}
      {...props}
    />
  );
};

export default ImageWithFallback;
