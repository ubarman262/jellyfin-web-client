import React from "react";
import { MediaItem } from "../../types/jellyfin";
import MediaRow from "./MediaRow";

interface CollectionSectionProps {
  items: MediaItem[];
  isLoading: boolean;
}

const CollectionSection: React.FC<CollectionSectionProps> = ({
  items,
  isLoading,
}) => {
  return (
    <div>
      <MediaRow title="" items={items} isLoading={isLoading} />
    </div>
  );
};

export default CollectionSection;
