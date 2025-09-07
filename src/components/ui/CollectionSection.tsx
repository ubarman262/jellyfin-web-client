import React from "react";
import { MediaItem } from "../../types/jellyfin";
import MediaRow from "./MediaRow";

interface CollectionSectionProps {
  items: MediaItem[];
  isLoading: boolean;
  onSelectItem?: (itemId: string) => void;
}

const CollectionSection: React.FC<CollectionSectionProps> = ({
  items,
  isLoading,
  onSelectItem,
}) => {
  return (
    <div>
      <MediaRow
        title=""
        items={items}
        isLoading={isLoading}
        onSelectItem={onSelectItem}
      />
    </div>
  );
};

export default CollectionSection;
