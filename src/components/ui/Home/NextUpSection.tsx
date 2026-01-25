import React from "react";
import MediaRow from "../MediaRow";
import { useMediaData } from "../../../hooks/useMediaData";

const NextUpSection: React.FC = () => {
  const { items, isLoading } = useMediaData("nextup", { limit: 20 });

  return (
    <MediaRow
      title="Next Up"
      items={items}
      isLoading={isLoading}
      isHorizontal={true}
    />
  );
};

export default NextUpSection;
