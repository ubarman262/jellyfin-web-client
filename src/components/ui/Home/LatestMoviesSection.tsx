import React from "react";
import MediaRow from "../MediaRow";
import { useMediaData } from "../../../hooks/useMediaData";

const LatestMoviesSection: React.FC = () => {
  const { items, isLoading } = useMediaData("latest", {
    limit: 20,
    mediaType: "Movie",
  });

  return <MediaRow title="Latest Movies" items={items} isLoading={isLoading} />;
};

export default LatestMoviesSection;
