import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageTemplate from "../components/layout/PageTemplate";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorDisplay from "../components/ui/ErrorDisplay";
import MediaDetailsHeader from "../components/ui/MediaDetails/MediaDetailsHeader";
import MediaDetailsContent from "../components/ui/MediaDetails/MediaDetailsContent";
import { useAuth } from "../context/AuthContext";
import { useMediaItem } from "../hooks/useMediaData";
import { MediaItem } from "../types/jellyfin";
import { typeEpisode, typeSeries } from "../utils/items";

const MediaDetailsPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { item, isLoading, error } = useMediaItem(itemId);
  const { api } = useAuth();
  const [seasons, setSeasons] = useState<MediaItem[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const isSeries = typeSeries(item);
  const isEpisode = typeEpisode(item);

  // Reset image loaded state when item changes
  useEffect(() => {
    setIsImageLoaded(false);
  }, [itemId]);

  // Fetch seasons logic
  useEffect(() => {
    if (isEpisode && api && item?.SeriesId) {
      setSeasonsLoading(true);
      api
        .getSeasons(item.SeriesId)
        .then((items) => {
          setSeasons(items);
          if (items && items.length > 0) {
            const found = items.find((s) => s.Id === item.ParentId);
            setSelectedSeasonId(found?.Id ?? items[0].Id);
          }
        })
        .catch(() => {
          setSeasons([]);
          setSelectedSeasonId(null);
        })
        .finally(() => setSeasonsLoading(false));
      return;
    }

    if (!isSeries || !api || !item?.Id) {
      setSeasons([]);
      setSeasonsLoading(false);
      setSelectedSeasonId(null);
      return;
    }

    setSeasonsLoading(true);
    api
      .getSeasons(item.Id)
      .then((items) => {
        setSeasons(items);
        if (items && items.length > 0) {
          const sorted = [...items].sort(
            (a, b) => (b.IndexNumber ?? 0) - (a.IndexNumber ?? 0)
          );
          setSelectedSeasonId(sorted[0]?.Id ?? items[items.length - 1].Id);
        }
      })
      .catch(() => {
        setSeasons([]);
        setSelectedSeasonId(null);
      })
      .finally(() => setSeasonsLoading(false));
  }, [isSeries, isEpisode, api, item?.Id, item?.SeriesId, item?.ParentId]);

  if (isLoading) {
    return <LoadingSpinner text="Loading media details..." />;
  }

  if (error || !item || !api) {
    return (
      <ErrorDisplay 
        title="Media Not Found"
        message="Failed to load media details. Please try again later."
      />
    );
  }

  // Image URLs
  const hasBackdropImage = isEpisode
    ? item.ParentBackdropImageTags && item.ParentBackdropImageTags.length > 0
    : item.BackdropImageTags && item.BackdropImageTags.length > 0;
  const hasPrimaryImage = item.ImageTags?.Primary;
  const hasLogoImage = item.ImageTags?.Logo;

  let backdropUrl = "";
  let posterUrl = "";
  let logoUrl = "";

  if (hasBackdropImage) {
    const itemId = isEpisode ? item.SeriesId : item.Id;
    backdropUrl = api.getImageUrl(itemId ?? "", "Backdrop", 1920);
  }

  if (hasPrimaryImage) {
    posterUrl = api.getImageUrl(item.Id, "Primary", 400);
  }

  if (hasLogoImage) {
    logoUrl = api.getImageUrl(item.Id, "Logo", 400);
  }

  return (
    <PageTemplate>
      <MediaDetailsHeader
        item={item}
        isEpisode={isEpisode}
        hasBackdropImage={hasBackdropImage}
        hasPrimaryImage={hasPrimaryImage}
        hasLogoImage={hasLogoImage}
        backdropUrl={backdropUrl}
        posterUrl={posterUrl}
        logoUrl={logoUrl}
        isImageLoaded={isImageLoaded}
        onImageLoad={() => setIsImageLoaded(true)}
      />

      <MediaDetailsContent
        item={item}
        seasons={seasons}
        seasonsLoading={seasonsLoading}
        selectedSeasonId={selectedSeasonId}
        onSeasonChange={setSelectedSeasonId}
      />
    </PageTemplate>
  );
}
export default MediaDetailsPage;
