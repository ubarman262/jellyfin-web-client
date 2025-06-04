import JellyfinApi from "../api/jellyfin";
import { MediaItem, People, Studios } from "../types/jellyfin";

const getBackdropUrl = (api: JellyfinApi, item: MediaItem) => {
  if (item.BackdropImageTags?.length) {
    //return api.getImageUrl(item.Id, "Backdrop", 1280);
    return api.getImageUrlProps({itemId: item.Id, imageType: "Backdrop", maxWidth: 1280, quality: 60});
  } else if (item.Type === "Episode" && item.SeriesId) {
    //return api.getImageUrl(item.SeriesId, "Backdrop", 1280);
    return api.getImageUrlProps({itemId: item.SeriesId, imageType: "Backdrop", maxWidth: 1280, quality: 60});
  } else {
    //return api.getImageUrl(item.Id, "Primary", 1280);
    return api.getImageUrlProps({itemId: item.Id, imageType: "Primary", maxWidth: 1280, quality: 60});
  }
};

// Helper to extract YouTube video ID from URL
const getYouTubeId = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v");
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.replace("/", "");
    }
    return null;
  } catch {
    return null;
  }
};

const typeEpisode = (item: MediaItem | null): boolean => {
  return item?.Type === "Episode";
};

const typeMovie = (item: MediaItem | null): boolean => {
  return item?.Type === "Movie";
};

const typeSeries = (item: MediaItem | null): boolean => {
  return item?.Type === "Series";
};

const fetchTrailerUrl = async (item: MediaItem, api: JellyfinApi | null) => {
  if (Array.isArray(item.RemoteTrailers) && item.RemoteTrailers.length > 0) {
    const trailer = item.RemoteTrailers[Math.floor(Math.random() * item.RemoteTrailers.length)];
    return trailer.Url;
  } else if (api && item.SeriesId) {
    const seriesItem = await api.getRemoteTrailers(item.SeriesId);
    if (
      Array.isArray(seriesItem.RemoteTrailers) &&
      seriesItem.RemoteTrailers.length > 0
    ) {
      
      const trailer = seriesItem.RemoteTrailers[Math.floor(Math.random() * seriesItem.RemoteTrailers.length)];
      return trailer.Url;
    }
  }
  return null;
};

const getDirectors = (item: MediaItem): string[] => {
  return Array.isArray(item.People)
    ? item.People.filter((p: People) => p.Type === "Director").map(
        (p) => p.Name
      )
    : [];
};

const getWriters = (item: MediaItem): string[] => {
  return Array.isArray(item.People)
    ? item.People.filter((p: People) => p.Type === "Writer").map((p) => p.Name)
    : [];
};

const getStudios = (item: MediaItem): string[] => {
  return Array.isArray(item.Studios)
    ? item.Studios.map((s: Studios) => s.Name)
    : [];
};

export {
  getBackdropUrl,
  getYouTubeId,
  typeEpisode,
  typeMovie,
  typeSeries,
  fetchTrailerUrl,
  getDirectors,
  getWriters,
  getStudios,
};
