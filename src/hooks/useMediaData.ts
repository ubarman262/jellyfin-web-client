import {useState, useEffect} from "react";
import {useAuth} from "../context/AuthContext";
import {MediaItem, ItemsResponse} from "../types/jellyfin";

export const useMediaData = (
    type:
        | "latest"
        | "movies"
        | "series"
        | "recommended"
        | "genre"
        | "resume"
        | "nextup"
        | "favourites",
    options?: { limit?: number; genreId?: string; startIndex?: number }
) => {
    const {api, isAuthenticated} = useAuth();
    const [items, setItems] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        if (!api || !isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                let result: MediaItem[] | ItemsResponse;
                const limit = options?.limit ?? 20;
                const startIndex = options?.startIndex ?? 0;

                switch (type) {
                    case "resume":
                        result = await api.getResumeItems(limit);
                        setItems(result);
                        setTotalItems(result.length);
                        break;
                    case "nextup":
                        result = await api.getNextUpItems(limit);
                        setItems(result);
                        setTotalItems(result.length);
                        break;
                    case "latest":
                        result = await api.getLatestMedia("", limit);
                        setItems(result);
                        setTotalItems(result.length);
                        break;
                    case "recommended":
                        result = await api.getRecommended(limit);
                        setItems(result);
                        setTotalItems(result.length);
                        break;
                    case "movies":
                        result = await api.getMediaByType("Movie", limit, startIndex);
                        setItems(result.Items);
                        setTotalItems(result.TotalRecordCount);
                        break;
                    case "series":
                        result = await api.getMediaByType("Series", limit, startIndex);
                        setItems(result.Items);
                        setTotalItems(result.TotalRecordCount);
                        break;
                    case "favourites":
                        result = await api.getFavourites(limit, startIndex);
                        setItems(result.Items);
                        setTotalItems(result.TotalRecordCount);
                        break;
                    case "genre":
                        if (!options?.genreId) {
                            throw new Error("Genre ID is required for genre type");
                        }
                        result = await api.getMediaByGenre(options.genreId, "", limit);
                        setItems(result.Items);
                        setTotalItems(result.TotalRecordCount);
                        break;
                    default:
                        throw new Error("Invalid media type");
                }
            } catch (err) {
                setError(
                    err instanceof Error ? err : new Error("An unknown error occurred")
                );
                console.error("Error fetching media data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [
        api,
        isAuthenticated,
        type,
        options?.limit,
        options?.genreId,
        options?.startIndex,
    ]);

    return {items, isLoading, error, totalItems};
};

export const useMediaItem = (itemId: string | undefined) => {
    const {api, isAuthenticated} = useAuth();
    const [item, setItem] = useState<MediaItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!api || !isAuthenticated || !itemId) {
            setIsLoading(false);
            return;
        }

        const fetchItem = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (itemId != "string") {
                    const result = await api.getMediaItem(itemId);
                    setItem(result);
                }
            } catch (err) {
                setError(
                    err instanceof Error ? err : new Error("An unknown error occurred")
                );
                console.error("Error fetching media item:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchItem();
    }, [api, isAuthenticated, itemId]);

    return {item, isLoading, error};
};

export const useSearch = (searchTerm: string, limit: number = 100) => {
  const { api, isAuthenticated } = useAuth();
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);

    useEffect(() => {
        if (!api || !isAuthenticated || !searchTerm.trim()) {
            setResults([]);
            setTotalResults(0);
            return;
        }

        const fetchResults = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await api.search(searchTerm, limit);
                setResults(result.Items);
                setTotalResults(result.TotalRecordCount);
            } catch (err) {
                setError(
                    err instanceof Error ? err : new Error("An unknown error occurred")
                );
                console.error("Error searching:", err);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search to avoid too many requests
        const timeoutId = setTimeout(() => {
            fetchResults();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [api, isAuthenticated, searchTerm, limit]);

  // Suggestions logic
  useEffect(() => {
    if (!api || !isAuthenticated) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const result = await api.getSearchSuggestions();
        setSuggestions(result.Items);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("An unknown error occurred")
        );
        console.error("Error searching:", err);
      }
    };

    // Debounce suggestions as well
    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [api, isAuthenticated, searchTerm]);

  return { results, isLoading, error, totalResults, suggestions };
};

export const useGenres = (mediaType: string = "") => {
    const {api, isAuthenticated} = useAuth();
    const [genres, setGenres] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!api || !isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const fetchGenres = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await api.getGenres(mediaType);
                setGenres(result.Items);
            } catch (err) {
                setError(
                    err instanceof Error ? err : new Error("An unknown error occurred")
                );
                console.error("Error fetching genres:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGenres();
    }, [api, isAuthenticated, mediaType]);

    return {genres, isLoading, error};
};
