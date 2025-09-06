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

// Helper to check if a YouTube video is a Short using Supabase HTTP function
const isYouTubeShort = (() => {
  const recentCalls: Record<string, number> = {};
  return async (url: string): Promise<boolean> => {
    const id = getYouTubeId(url);
    if (!id) return false;
    const now = Date.now();
    if (recentCalls[id] && now - recentCalls[id] < 3000) {
      // Called within last 3 seconds, skip request and assume not a Short
      return false;
    }
    recentCalls[id] = now;
    const endpoint = `https://aanbbnsqutrtyannezaj.supabase.co/functions/v1/short/${id}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbmJibnNxdXRydHlhbm5lemFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODk0MzEsImV4cCI6MjA3Mjc2NTQzMX0._vQqNoOxpFq9ZptdzoqXGVu29oUcS6LrDhcva_9XtUA",
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) return true; // Assume not a Short if error
      const data = await response.json();
      return !!data;
    } catch {
      clearTimeout(timeout);
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
    // Pick a random valid URL
    const randomIdx = Math.floor(Math.random() * validUrls.length);
    return validUrls[randomIdx];
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
