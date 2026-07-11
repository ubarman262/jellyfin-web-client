import JellyfinApi from "../api/jellyfin";
import { MediaItem, People, Studios } from "../types/jellyfin";
import { SearchResponseResult } from "../api/marlin-search";

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

// Helper to check if a YouTube video is a Short using oEmbed
const isYouTubeShort = (() => {
  const cache: Record<string, boolean> = {};
  return async (url: string): Promise<boolean> => {
    const id = getYouTubeId(url);
    if (!id) return false;
    
    if (id in cache) return cache[id];
    
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${id}&format=json`);
      if (response.ok) {
        const data = await response.json();
        const isShort = data.height > data.width;
        cache[id] = isShort;
        return isShort;
      }
      return false;
    } catch {
      return false;
    }
  };
})();

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
    // Check all trailers in parallel and collect valid URLs
    const checks = await Promise.all(trailers.map(async (trailer) => {
      const url = trailer.Url;
      const id = getYouTubeId(url);
      if (id && await isYouTubeShort(url)) return null; // skip Shorts
      return url || null;
    }));
    const validUrls = checks.filter(Boolean) as string[];
    if (validUrls.length === 0) return null;
    
    // Shuffle the valid URLs so it's not always the exact same order
    for (let i = validUrls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validUrls[i], validUrls[j]] = [validUrls[j], validUrls[i]];
    }
    return validUrls;
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

const sortSeasons = (seasons: MediaItem[]): MediaItem[] => {
  return [...seasons].sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));
}

const getMarlinSearchIds = (
  result: SearchResponseResult,
): string[] | null => {
  if (Array.isArray(result)) return null;
  if ("ids" in result && Array.isArray(result.ids)) return result.ids;
  return null;
};

const getMarlinResultId = (
  result: SearchResponseResult | null,
): string | null => {
  if (!result || !Array.isArray(result) || result.length === 0) return null;
  const first = result[0] as { Id?: unknown };
  return typeof first?.Id === "string" ? first.Id : null;
};

const getMarlinResultTitle = (
  result: SearchResponseResult | null,
): string | null => {
  if (!result || !Array.isArray(result) || result.length === 0) return null;
  const first = result[0] as { Name?: unknown };
  return typeof first?.Name === "string" ? first.Name : null;
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
  sortSeasons,
  getMarlinSearchIds,
  getMarlinResultId,
  getMarlinResultTitle
};
