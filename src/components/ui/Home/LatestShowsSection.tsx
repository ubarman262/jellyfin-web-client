import React from "react";
import MediaRow from "../MediaRow";
import { useMediaData } from "../../../hooks/useMediaData";

const LatestShowsSection: React.FC = () => {
  const { items, isLoading } = useMediaData("latest", {
    limit: 20,
    mediaType: "Series",
  });

  return <MediaRow title="Latest Shows" items={items} isLoading={isLoading} />;
};

export default LatestShowsSection;
