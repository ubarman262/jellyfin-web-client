import JellyfinApi from "../api/jellyfin";
import { MediaItem, People, Studios } from "../types/jellyfin";

const getBackdropUrl = (api: JellyfinApi, item: MediaItem) => {
  if (item?.BackdropImageTags?.length) {
    return api.getImageUrl(item.Id, "Backdrop", 1280);
  } else if (item?.Type === "Episode" && item?.SeriesId) {
    return api.getImageUrl(item?.SeriesId, "Backdrop", 1280);
  } else {
    return api.getImageUrl(item?.Id, "Primary", 1280);
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

// Helper to check if a YouTube video is a Short using allorigins proxy to bypass CORS
const isYouTubeShort = async (url: string): Promise<boolean> => {
  const id = getYouTubeId(url);
  if (!id) return false;
  const shortsUrl = `https://www.youtube.com/shorts/${id}`;
  const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(shortsUrl)}`;
  try {
    // allorigins only supports GET, so we can't do HEAD, but we can check the final URL after redirects
    const response = await fetch(proxyUrl);
    if (!response.ok) return false;
    const data = await response.json();
    // If the response contains the Shorts page HTML, it's a Short (no redirect)
    // If it's redirected, the contents will be from /watch?v=...
    // Heuristic: Shorts page contains '<meta property="og:url" content="https://www.youtube.com/shorts/'
    if (typeof data.contents === "string" && data.contents.includes('property="og:url"') && data.contents.includes("/shorts/")) {
      return true;
    }
    return false;
  } catch {
    return false;
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
  const tryTrailers = async (trailers: { Url: string }[]) => {
    for (const trailer of trailers) {
      const url = trailer.Url;
      const id = getYouTubeId(url);
      if (id) {
        if (await isYouTubeShort(url)) continue; // skip Shorts
      }
      return url;
    }
    return null;
  };

  if (Array.isArray(item.RemoteTrailers) && item.RemoteTrailers.length > 0) {
    return await tryTrailers(item.RemoteTrailers);
  } else if (api && item.SeriesId) {
    const seriesItem = await api.getRemoteTrailers(item.SeriesId);
    if (
      Array.isArray(seriesItem.RemoteTrailers) &&
      seriesItem.RemoteTrailers.length > 0
    ) {
      return await tryTrailers(seriesItem.RemoteTrailers);
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
