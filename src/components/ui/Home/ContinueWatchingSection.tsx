import React from "react";
import MediaRow from "../MediaRow";
import { useMediaData } from "../../../hooks/useMediaData";

const ContinueWatchingSection: React.FC = () => {
  const { items, isLoading } = useMediaData("resume", { limit: 20 });

  return (
    <MediaRow
      title="Continue Watching"
      items={items}
      isLoading={isLoading}
      isHorizontal={true}
    />
  );
};

export default ContinueWatchingSection;
