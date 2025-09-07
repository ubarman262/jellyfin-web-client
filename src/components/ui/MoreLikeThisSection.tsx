import React from "react";
import { MediaItem } from "../../types/jellyfin";
import MediaRow from "./MediaRow";

interface MoreLikeThisSectionProps {
  item: MediaItem;
  items: MediaItem[];
  isLoading: boolean;
  onSelectItem?: (itemId: string) => void; // <-- add prop
}

const MoreLikeThisSection: React.FC<MoreLikeThisSectionProps> = ({
  item,
  items,
  isLoading,
  onSelectItem,
}) => {
  return (
    <div>
      {item.Type === "Episode" && item.SeriesId && (
        <h3 className="text-xl font-semibold text-white mb-4">
          More like this
        </h3>
      )}
      <MediaRow
        title=""
        items={items}
        isLoading={isLoading}
        onSelectItem={onSelectItem} // <-- pass handler
      />
    </div>
  );
};

export default MoreLikeThisSection;
