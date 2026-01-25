import axios from "axios";
import {
  CultureInfo,
  Items,
  ItemsResponse,
  JellyfinAuthResult,
  JellyfinConfig,
  MediaItem,
  MediaSourceResponse,
  MediaStream,
  PlaybackInfoOptions,
  RemoteSubtitleInfo,
  UserLogin,
} from "../types/jellyfin";
import {
  getMarlinResultId,
  getMarlinResultTitle,
  getMarlinSearchIds,
} from "../utils/items";
import MarlinSearchAPI, {
  createMarlinSearchClient,
  SearchResponseResult,
} from "./marlin-search";
class JellyfinApi {
  private readonly serverUrl: string;
  private readonly apiKey?: string;
  private userId?: string;
  private accessToken?: string;
  private readonly deviceId: string;
  private readonly deviceName: string;
  private readonly clientName: string;
  private readonly clientVersion: string;
  private marlinSearchClient?: MarlinSearchAPI;
  private moviesParentId?: string;
  private seriesParentId?: string;
  private collectionsParentId?: string;

  constructor(config: JellyfinConfig) {
    // Ensure server URL is properly formatted
    this.serverUrl = this.normalizeServerUrl(config.serverUrl);
    this.apiKey = config.apiKey;
    this.userId = config.userId;

    // Generate a unique device ID if not provided
    this.deviceId =
      localStorage.getItem("jellyfin_device_id") ?? this.generateDeviceId();
    localStorage.setItem("jellyfin_device_id", this.deviceId);

    this.deviceName = "Jellyfin Web Client";
    this.clientName = "Jellyfin Web Client";
    this.clientVersion = "1.0.0";

    // Restore session if available
    const storedToken = localStorage.getItem("jellyfin_access_token");
    const storedUserId = localStorage.getItem("jellyfin_user_id");

    if (storedToken && storedUserId) {
      this.accessToken = storedToken;
      this.userId = storedUserId;
    }

    // Restore parent IDs from config or localStorage
    this.moviesParentId =
      config.moviesParentId ??
      localStorage.getItem("jellyfin_movies_parent_id") ??
      undefined;
    this.seriesParentId =
      config.seriesParentId ??
      localStorage.getItem("jellyfin_series_parent_id") ??
      undefined;
    this.collectionsParentId =
      config.collectionsParentId ??
      localStorage.getItem("jellyfin_collections_parent_id") ??
      undefined;

    // Initialize parent IDs if session exists but parent IDs are missing
    if (
      storedToken &&
      storedUserId &&
      (!this.moviesParentId ||
        !this.seriesParentId ||
        !this.collectionsParentId)
    ) {
      // Use setTimeout to avoid blocking constructor
      setTimeout(() => {
        this.initializeLibraryParentIds().catch((error) => {
          console.error("Failed to initialize parent IDs on app load:", error);
        });
      }, 0);
    }

    // Configure axios defaults
    axios.defaults.timeout = 10000; // 10 second timeout
    axios.defaults.validateStatus = (status) => status >= 200 && status < 300;

    // Initialize MarlinSearch if configured (check both config and localStorage)
    let marlinSearchUrl = config.marlinSearchUrl;
    let marlinSearchToken = config.marlinSearchToken;
    let marlinSearchEnabled = marlinSearchUrl ? true : undefined;

    // Check localStorage for jellyfin_user_settings plugin config
    try {
      const storedSettings = localStorage.getItem("jellyfin_user_settings");
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        const plugin = parsedSettings?.plugins?.marlinSearch;
        if (plugin) {
          marlinSearchEnabled = plugin.enabled ?? marlinSearchEnabled;
          if (plugin.config?.baseUrl) {
            marlinSearchUrl = plugin.config.baseUrl;
            marlinSearchToken = plugin.config.authToken;
          }
        }
      }
    } catch (error) {
      console.warn(
        "Failed to parse jellyfin_user_settings from localStorage:",
        error,
      );
    }

    // Fallback to legacy marlinSearchConfig if still present and no new config
    if (!marlinSearchUrl) {
      try {
        const storedConfig = localStorage.getItem("marlinSearchConfig");
        if (storedConfig) {
          const parsedConfig = JSON.parse(storedConfig);
          marlinSearchUrl = parsedConfig.baseUrl;
          marlinSearchToken = parsedConfig.authToken;
          marlinSearchEnabled = true;

          const currentSettings = localStorage.getItem(
            "jellyfin_user_settings",
          );
          const parsedSettings = currentSettings
            ? JSON.parse(currentSettings)
            : {};
          const updated = {
            ...parsedSettings,
            plugins: {
              ...parsedSettings?.plugins,
              marlinSearch: {
                enabled: true,
                config: {
                  baseUrl: marlinSearchUrl,
                  authToken: marlinSearchToken,
                },
              },
            },
          };
          localStorage.setItem(
            "jellyfin_user_settings",
            JSON.stringify(updated),
          );
          localStorage.removeItem("marlinSearchConfig");
        }
      } catch (error) {
        console.warn(
          "Failed to parse marlinSearchConfig from localStorage:",
          error,
        );
      }
    }

    if (marlinSearchUrl && marlinSearchEnabled !== false) {
      this.marlinSearchClient = createMarlinSearchClient({
        baseUrl: marlinSearchUrl,
        authToken: marlinSearchToken || undefined,
        timeout: 5000,
      });
    }
  }

  private normalizeServerUrl(url: string): string {
    // Remove trailing slashes
    let normalizedUrl = url.trim().replace(/\/+$/, "");

    // Ensure URL has protocol
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = `http://${normalizedUrl}`;
    }

    // Store normalized URL
    localStorage.setItem("jellyfin_server_url", normalizedUrl);

    return normalizedUrl;
  }

  private generateDeviceId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replaceAll(/[xy]/g, (c) => {
      const r = Math.trunc(Math.random() * 16);
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Emby-Authorization": `MediaBrowser Client="${this.clientName}", Device="${this.deviceName}", DeviceId="${this.deviceId}", Version="${this.clientVersion}"`,
    };

    if (this.accessToken) {
      headers["X-Emby-Token"] = this.accessToken;
    } else if (this.apiKey) {
      headers["X-Emby-Authorization"] += `, Token="${this.apiKey}"`;
    }

    return headers;
  }

  private async makeRequest<T>(
    method: "get" | "post" | "put" | "delete",
    endpoint: string,
    data?: unknown,
    params?: unknown,
  ): Promise<T> {
    try {
      const url = `${this.serverUrl}/emby${endpoint}`;
      const config = {
        method,
        url,
        headers: this.getHeaders(),
        data,
        params,
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          throw new Error(
            "Connection timeout. Please check if the Jellyfin server is accessible.",
          );
        }
        if (!error.response) {
          throw new Error(
            `Network error: Unable to connect to Jellyfin server at ${this.serverUrl}. Please verify the server URL and ensure the server is running.`,
          );
        }
        if (error.response.status === 401) {
          // Clear invalid credentials
          this.logout();
          throw new Error("Authentication failed. Please log in again.");
        }
        throw new Error(
          `Server error: ${error.response.data?.Message ?? error.message}`,
        );
      }
      throw error;
    }
  }

  private async isMarlinSearchAvailable(): Promise<boolean> {
    if (!this.marlinSearchClient) {
      console.log("MarlinSearch client is not initialized");
      return false;
    }

    try {
      console.log("Checking MarlinSearch status...");
      const status = await this.marlinSearchClient.checkStatus();
      console.log("MarlinSearch status response:", status);
      return status.includes("OK") || status.includes("up");
    } catch (error) {
      console.log("MarlinSearch status check failed:", error);
      return false;
    }
  }

  async login(credentials: UserLogin): Promise<JellyfinAuthResult> {
    try {
      const response = await this.makeRequest<JellyfinAuthResult>(
        "post",
        "/Users/AuthenticateByName",
        {
          Username: credentials.username,
          Pw: credentials.password,
        },
      );

      // Save auth data
      this.accessToken = response.AccessToken;
      this.userId = response.User.Id;

      localStorage.setItem("jellyfin_access_token", response.AccessToken);
      localStorage.setItem("jellyfin_user_id", response.User.Id);

      // Initialize library parent IDs after successful login
      await this.initializeLibraryParentIds();

      return response;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (!this.accessToken) return;

    try {
      await this.makeRequest("post", "/Sessions/Logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Clear auth data regardless of API call success
      this.accessToken = undefined;
      this.userId = undefined;
      this.moviesParentId = undefined;
      this.seriesParentId = undefined;
      localStorage.removeItem("jellyfin_access_token");
      localStorage.removeItem("jellyfin_user_id");
      localStorage.removeItem("jellyfin_movies_parent_id");
      localStorage.removeItem("jellyfin_series_parent_id");
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.userId;
  }

  async getResumeItems(limit: number = 16): Promise<MediaItem[]> {
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items/Resume`,
      undefined,
      {
        Limit: limit,
        Fields: "UserData, IsHD, Is4K",
      },
    ).then((response) => response.Items);
  }

  async getNextUpItems(limit: number = 16): Promise<MediaItem[]> {
    // Set NextUpDateCutoff to one year ago from now
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return this.makeRequest<ItemsResponse>("get", `/Shows/NextUp`, undefined, {
      Limit: limit,
      Fields: "PrimaryImageAspectRatio, IsHD, Is4K",
      UserId: this.userId,
      ImageTypeLimit: 1,
      EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
      EnableTotalRecordCount: false,
      DisableFirstEpisode: false,
      NextUpDateCutoff: oneYearAgo.toISOString(),
      EnableResumable: false,
      EnableRewatching: false,
    }).then((response) => response.Items);
  }

  async getLatestMedia(
    mediaType: string = "",
    limit: number = 16,
  ): Promise<MediaItem[]> {
    let parentId = null;
    if (mediaType === "Movie") {
      parentId = this.moviesParentId;
    } else if (mediaType === "Series") {
      parentId = this.seriesParentId;
    }

    return this.makeRequest<MediaItem[]>(
      "get",
      `/Users/${this.userId}/Items/Latest`,
      undefined,
      {
        Limit: limit,
        Fields: "Overview,Genres,PrimaryImageAspectRatio, IsHD, Is4K",
        ImageTypeLimit: 1,
        ParentId: parentId,
      },
    );
  }

  async getRecommended(limit: number = 10): Promise<MediaItem[]> {
    return this.makeRequest<MediaItem[]>(
      "get",
      `/Users/${this.userId}/Items/Latest`,
      undefined,
      {
        Limit: limit,
        Fields:
          "Overview,Genres,PrimaryImageTag,BackdropImageTags,RemoteTrailers, IsHD, Is4K",
      },
    );
  }

  async getMediaByType(
    mediaType: string,
    genres?: string,
    limit: number = 20,
    startIndex: number = 0,
    latest: boolean = false,
  ): Promise<ItemsResponse> {
    let parentId = null;
    if (mediaType === "Movie") {
      parentId = this.moviesParentId;
    } else if (mediaType === "Series") {
      parentId = this.seriesParentId;
    }
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        Recursive: true,
        Limit: limit,
        StartIndex: startIndex,
        SortBy: latest ? "DateCreated,SortName" : "SortName",
        SortOrder: latest ? "Descending" : "Ascending",
        Fields:
          "Overview,Genres,PrimaryImageTag,BackdropImageTags,RemoteTrailers, IsHD, Is4K",
        Genres: genres,
        IncludeItemTypes: mediaType,
        ParentId: parentId,
      },
    );
  }

  async getFavourites(
    limit: number = 20,
    startIndex: number = 0,
    mediaType?: string,
  ): Promise<ItemsResponse> {
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        IncludeItemTypes: mediaType,
        Recursive: true,
        Limit: limit,
        StartIndex: startIndex,
        SortBy: "SortName",
        SortOrder: "Ascending",
        Filters: "IsFavorite",
        Fields:
          "Overview,Genres,PrimaryImageTag,BackdropImageTags,RemoteTrailers, IsHD, Is4K",
      },
    );
  }

  async getMediaItem(itemId: string): Promise<MediaItem> {
    return this.makeRequest<MediaItem>(
      "get",
      `/Users/${this.userId}/Items/${itemId}`,
      undefined,
      {
        Fields:
          "Overview,Genres,PrimaryImageTag,BackdropImageTags,MediaStreams,RemoteTrailers,Chapters, IsHD, Is4K",
      },
    );
  }

  async getMediaByGenre(
    genreId: string,
    mediaType: string = "",
    limit: number = 20,
  ): Promise<ItemsResponse> {
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        GenreIds: genreId,
        IncludeItemTypes: mediaType,
        Recursive: true,
        Limit: limit,
        Fields: "Overview,Genres,PrimaryImageTag,BackdropImageTags, IsHD, Is4K",
      },
    );
  }

  async getGenres(mediaType: string = ""): Promise<ItemsResponse> {
    return this.makeRequest<ItemsResponse>("get", "/Genres", undefined, {
      UserId: this.userId,
      IncludeItemTypes: mediaType,
      SortBy: "SortName",
    });
  }

  async search(
    searchTerm: string,
    limit: number = 100,
  ): Promise<ItemsResponse> {
    const isMarlinAvailable = await this.isMarlinSearchAvailable();

    // Try MarlinSearch first if available
    if (this.marlinSearchClient && isMarlinAvailable) {
      try {
        const marlinResults = await this.marlinSearchClient.search(searchTerm, {
          onlyIds: true,
        });

        const marlinIds = getMarlinSearchIds(marlinResults);
        if (marlinIds && marlinIds.length > 0) {
          // Fetch full MediaItem details for each ID
          const mediaItems: MediaItem[] = [];
          const idsToFetch = marlinIds.slice(0, limit);

          const results = await Promise.allSettled(
            idsToFetch.map(async (id) => {
              try {
                return await this.getMediaItem(id);
              } catch (error) {
                console.warn(`Failed to fetch item ${id}:`, error);
                return null;
              }
            }),
          );

          // Filter out failed requests and null results
          results.forEach((result) => {
            if (result.status === "fulfilled" && result.value) {
              mediaItems.push(result.value);
            }
          });

          return {
            Items: mediaItems,
            TotalRecordCount: mediaItems.length,
            StartIndex: 0,
          };
        }
      } catch (error) {
        console.warn(
          "MarlinSearch failed, falling back to Jellyfin search:",
          error,
        );
      }
    }

    // Fallback to original Jellyfin search
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        SearchTerm: searchTerm,
        Recursive: true,
        Limit: limit,
        Fields:
          "PrimaryImageAspectRatio,CanDelete,MediaSourceCount, IsHD, Is4K",
        IncludeItemTypes: "Movie,Series",
        ImageTypeLimit: 1,
        EnableTotalRecordCount: false,
      },
    );
  }

  getImageUrl(
    itemId: string,
    imageType: string = "Primary",
    maxWidth?: number,
    maxHeight?: number,
  ): string {
    let url = `${this.serverUrl}/emby/Items/${itemId}/Images/${imageType}`;

    const params = new URLSearchParams();
    if (maxWidth) params.append("maxWidth", maxWidth.toString());
    if (maxHeight) params.append("maxHeight", maxHeight.toString());
    if (this.userId) params.append("tag", this.userId);

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Get the image URL for a user.
   * @param userId The user ID.
   * @param tag The image tag (optional, for cache busting/versioning).
   * @param quality Image quality (optional, default 90).
   */
  getUserImageUrl(userId: string, tag?: string, quality: number = 90): string {
    let url = `${this.serverUrl}/emby/Users/${userId}/Images/Primary`;
    const params = new URLSearchParams();
    if (tag) params.append("tag", tag);
    if (quality) params.append("quality", quality.toString());
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    return url;
  }

  async getPlaybackInfo(
    itemId: string,
    options: PlaybackInfoOptions,
  ): Promise<MediaSourceResponse> {
    return this.makeRequest<MediaSourceResponse>(
      "post",
      `/Items/${itemId}/PlaybackInfo`,
      options,
    );
  }

  getPlaybackUrl(itemId: string, audioStreamIndex: number = 0): string {
    const params = new URLSearchParams({
      DeviceId: this.deviceId,
      MediaSourceId: itemId,
      api_key: this.accessToken ?? "",
      VideoCodec: "av1,hevc,h264,vp9",
      AudioCodec: "aac",
      AudioStreamIndex: audioStreamIndex.toString(),
      VideoBitrate: "139616000",
      AudioBitrate: "384000",
      MaxFramerate: "23.976025",
      PlaySessionId: `${this.deviceId}-${Date.now()}`,
      TranscodingMaxAudioChannels: "2",
      RequireAvc: "false",
      EnableAudioVbrEncoding: "true",
      SegmentContainer: "mp4",
      MinSegments: "1",
      BreakOnNonKeyFrames: "true",
      "h264-level": "40",
      "h264-videobitdepth": "8",
      "h264-profile": "high",
      "av1-profile": "main",
      "av1-rangetype": "SDR,HDR10,HLG",
      "av1-level": "19",
      "vp9-rangetype": "SDR,HDR10,HLG",
      "hevc-profile": "main,main10",
      "hevc-rangetype": "SDR,HDR10,HLG",
      "hevc-level": "183",
      "hevc-deinterlace": "true",
      "h264-rangetype": "SDR",
      "h264-deinterlace": "true",
      TranscodeReasons: "ContainerNotSupported, AudioCodecNotSupported",
      TranscodingProtocol: "hls",
      TranscodingContainer: "ts",
    });

    return `${this.serverUrl}/videos/${itemId}/main.m3u8?${params.toString()}`;
  }

  async fetchSubtitleTracks(item: MediaItem): Promise<MediaStream[]> {
    const response = await this.makeRequest<MediaSourceResponse>(
      "post",
      `/Items/${item.Id}/PlaybackInfo?api_key=${this.accessToken}`,
      JSON.stringify({
        MediaSourceId: item.Id,
        DeviceId: this.deviceId,
      }),
    );

    // Safely access MediaStreams and filter by Type === 'Subtitle'
    const subtitles =
      response?.MediaSources?.[0]?.MediaStreams?.filter(
        (stream) => stream.Type === "Subtitle",
      ) ?? []; // fallback to empty array if undefined

    return subtitles;
  }

  async fetchSelectedSubtitle(
    itemId: string,
    subtitleStreamIndex: number,
  ): Promise<[]> {
    const endpoint = `/Videos/${itemId}/${itemId}/Subtitles/${subtitleStreamIndex}/0/Stream.js`;
    const response = await this.makeRequest<{
      TrackEvents: [];
    }>("get", endpoint, undefined, {
      api_key: this.accessToken,
    });
    return response.TrackEvents;
  }

  /**
   * Get the VTT subtitle stream URL for a given item and subtitle track.
   * @param itemId The media item ID.
   * @param subtitleIndex The subtitle track index.
   * @returns The VTT stream URL.
   */
  getVTTStream(itemId: string, subtitleIndex: number): string {
    return `${this.serverUrl}/Videos/${itemId}/${itemId}/Subtitles/${subtitleIndex}/stream.vtt?api_key=${this.apiKey}`;
  }

  getVideoTracks(itemId: string): string {
    return `${this.serverUrl}/Videos/${itemId}/master.m3u8??MediaSourceId=${itemId}&api_key=${this.apiKey}`;
  }

  async reportPlaybackProgress(
    itemId: string,
    positionSeconds: number,
    audioStreamIndex?: number,
    subtitleStreamIndex?: number,
  ) {
    if (!this.userId || !this.accessToken) return;
    try {
      await this.makeRequest("post", `/Sessions/Playing/Progress`, {
        ItemId: itemId,
        MediaSourceId: itemId,
        PositionTicks: Math.floor(positionSeconds * 10000000),
        PlaybackStartTimeTicks: 0,
        IsPaused: false,
        IsMuted: false,
        VolumeLevel: 100,
        PlayMethod: "Transcode",
        RepeatMode: "RepeatNone",
        PlaylistItemId: null,
        LiveStreamId: null,
        PlaySessionId: this.deviceId,
        AudioStreamIndex:
          typeof audioStreamIndex === "number" ? audioStreamIndex : 0,
        SubtitleStreamIndex:
          typeof subtitleStreamIndex === "number" ? subtitleStreamIndex : 0,
      });
    } catch (e: unknown) {
      console.log(e);
    }
  }

  async reportPlaying({
    itemId,
    mediaSourceId,
    playSessionId,
    audioStreamIndex = 0,
    subtitleStreamIndex = 0,
    positionTicks = 0,
    volumeLevel = 100,
    isMuted = false,
    isPaused = false,
    repeatMode = "RepeatNone",
    shuffleMode = "Sorted",
    maxStreamingBitrate = 140000000,
    playbackStartTimeTicks = 0,
    playbackRate = 1,
    secondarySubtitleStreamIndex = -1,
    bufferedRanges = [],
    playMethod = "DirectPlay",
    nowPlayingQueue = [],
    canSeek = true,
  }: {
    itemId: string;
    mediaSourceId: string;
    playSessionId: string;
    audioStreamIndex?: number;
    subtitleStreamIndex?: number;
    positionTicks?: number;
    volumeLevel?: number;
    isMuted?: boolean;
    isPaused?: boolean;
    repeatMode?: string;
    shuffleMode?: string;
    maxStreamingBitrate?: number;
    playbackStartTimeTicks?: number;
    playbackRate?: number;
    secondarySubtitleStreamIndex?: number;
    bufferedRanges?: { start: number; end: number }[];
    playMethod?: string;
    nowPlayingQueue?: { Id: string; PlaylistItemId: string }[];
    canSeek?: boolean;
  }) {
    await this.makeRequest("post", "/Sessions/Playing", {
      VolumeLevel: volumeLevel,
      IsMuted: isMuted,
      IsPaused: isPaused,
      RepeatMode: repeatMode,
      ShuffleMode: shuffleMode,
      MaxStreamingBitrate: maxStreamingBitrate,
      PositionTicks: positionTicks,
      PlaybackStartTimeTicks: playbackStartTimeTicks,
      PlaybackRate: playbackRate,
      SubtitleStreamIndex: subtitleStreamIndex,
      SecondarySubtitleStreamIndex: secondarySubtitleStreamIndex,
      AudioStreamIndex: audioStreamIndex,
      BufferedRanges: bufferedRanges,
      PlayMethod: playMethod,
      PlaySessionId: playSessionId,
      PlaylistItemId: nowPlayingQueue[0]?.PlaylistItemId ?? "playlistItem0",
      MediaSourceId: mediaSourceId,
      CanSeek: canSeek,
      ItemId: itemId,
      NowPlayingQueue: nowPlayingQueue.length
        ? nowPlayingQueue
        : [{ Id: itemId, PlaylistItemId: "playlistItem0" }],
    });
  }

  async getPersonMedia(personId: string): Promise<Items> {
    // Fetch person info from /emby/Items/{personId}
    return this.makeRequest<Items>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        PersonIds: personId,
        IncludeItemTypes: "Movie,Series",
        Recursive: true,
        Fields:
          "Overview,Genres,PrimaryImageTag,BackdropImageTags,ProductionYear",
        SortBy: "ProductionYear,SortName",
        SortOrder: "Descending",
      },
    );
  }

  /**
   * Get next up episodes for a specific series.
   * @param seriesId The series ID.
   * @param limit Optional limit for number of episodes.
   */
  async getSeriesNextUp(
    seriesId: string,
    limit: number = 10,
  ): Promise<MediaItem[]> {
    return this.makeRequest<ItemsResponse>("get", `/Shows/NextUp`, undefined, {
      SeriesId: seriesId,
      UserId: this.userId,
      Fields:
        "MediaSourceCount,PrimaryImageTag,BackdropImageTags,Overview,Genres",
      Limit: limit,
    }).then((response) => response.Items);
  }

  /**
   * Get all seasons for a series.
   * @param seriesId The series ID.
   */
  async getSeasons(seriesId: string): Promise<MediaItem[]> {
    const data = await this.makeRequest<ItemsResponse>(
      "get",
      `/Shows/${seriesId}/Seasons`,
      undefined,
      {
        UserId: this.userId,
        Fields: "Overview,Genres,PrimaryImageTag,BackdropImageTags",
      },
    );
    return data.Items ?? [];
  }

  /**
   * Get all episodes for a given series and season.
   * @param seriesId The series ID.
   * @param seasonId The season ID.
   */
  async getEpisodes(
    seriesId: string,
    seasonId: string | undefined,
  ): Promise<MediaItem[]> {
    const data = await this.makeRequest<ItemsResponse>(
      "get",
      `/Shows/${seriesId}/Episodes`,
      undefined,
      {
        SeasonId: seasonId,
        UserId: this.userId,
        SortBy: "IndexNumber",
        SortOrder: "Ascending",
        Fields:
          "ItemCounts,PrimaryImageAspectRatio,CanDelete,Overview,MediaSourceCount",
      },
    );
    return data.Items ?? [];
  }

  /**
   * Mark an item as played for the current user.
   * @param itemId The item ID to mark as played.
   * @param datePlayed Optional ISO date string. Defaults to now.
   */
  async markItemPlayed(itemId: string, datePlayed?: string): Promise<void> {
    if (!this.userId) throw new Error("User not authenticated");
    const date = datePlayed ?? new Date().toISOString();
    await this.makeRequest(
      "post",
      `/Users/${this.userId}/PlayedItems/${itemId}`,
      undefined,
      { DatePlayed: date },
    );
  }

  /**
   * Mark an item as unplayed for the current user.
   * @param itemId The item ID to mark as unplayed.
   */
  async markItemUnplayed(itemId: string): Promise<void> {
    if (!this.userId) throw new Error("User not authenticated");
    await this.makeRequest(
      "delete",
      `/Users/${this.userId}/PlayedItems/${itemId}`,
    );
  }

  /**
   * Mark or unmark an item as a favorite for the current user.
   * @param itemId The item ID to mark as favorite.
   * @param isFavorite Whether to mark as favorite (true) or remove from favorites (false).
   */
  async markAsFavourite(
    itemId: string,
    isFavorite: boolean = true,
  ): Promise<void> {
    if (!this.userId) throw new Error("User not authenticated");
    if (isFavorite) {
      await this.makeRequest(
        "post",
        `/Users/${this.userId}/FavoriteItems/${itemId}`,
      );
    } else {
      await this.makeRequest(
        "delete",
        `/Users/${this.userId}/FavoriteItems/${itemId}`,
      );
    }
  }

  async getRemoteTrailers(itemId: string): Promise<MediaItem> {
    return this.makeRequest<MediaItem>(
      "get",
      `/Users/${this.userId}/Items/${itemId}`,
      undefined,
      {
        Fields: "RemoteTrailers",
      },
    );
  }

  /**
   * Get similar items for a given item.
   * @param itemId The item ID to find similar items for.
   * @param limit Number of similar items to fetch.
   */
  async getSimilarItems(
    itemId: string,
    limit: number = 12,
  ): Promise<ItemsResponse> {
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Items/${itemId}/Similar`,
      undefined,
      {
        userId: this.userId,
        limit,
        fields: "PrimaryImageAspectRatio,CanDelete",
      },
    );
  }

  /**
   * Get search suggestions for the current user.
   * Returns a mix of Movies, Series, and MusicArtists.
   * @param limit Number of suggestions to fetch (default: 20)
   */
  async getSearchSuggestions(limit: number = 20): Promise<ItemsResponse> {
    if (!this.userId) throw new Error("User not authenticated");
    return this.makeRequest<ItemsResponse>("get", `/Items`, undefined, {
      userId: this.userId,
      limit,
      recursive: true,
      includeItemTypes: ["Movie", "Series"].join(","),
      sortBy: ["IsFavoriteOrLiked", "Random"].join(","),
      imageTypeLimit: 1,
      enableTotalRecordCount: false,
      enableImages: true,
    });
  }

  /**
   * Get a list of all studios for the current user.
   * Returns an ItemsResponse with studios.
   * @param limit Number of studios to fetch (optional)
   */
  async getStudios(limit: number = 100): Promise<ItemsResponse> {
    if (!this.userId) throw new Error("User not authenticated");
    return this.makeRequest<ItemsResponse>("get", `/Studios`, undefined, {
      userId: this.userId,
      limit,
      recursive: true,
      sortBy: "SortName",
    });
  }

  /**
   * Get a studio by name for the current user.
   * Returns an ItemsResponse with studios matching the name.
   * @param name Studio name (partial or full, case-insensitive)
   * @param limit Number of studios to fetch (optional)
   */
  async getStudioByName(
    name: string,
    limit: number = 5,
  ): Promise<ItemsResponse> {
    if (!this.userId) throw new Error("User not authenticated");
    return this.makeRequest<ItemsResponse>("get", `/Studios`, undefined, {
      userId: this.userId,
      limit,
      recursive: true,
      sortBy: "SortName",
      searchTerm: name,
    });
  }

  /**
   * Get all movies for a given studio ID.
   * @param studioId The studio's ID.
   * @param limit Number of movies to fetch (default: 48)
   * @param startIndex Pagination start index (default: 0)
   */
  async getItemsByStudioId(
    studioId: string,
    limit: number = 48,
    startIndex: number = 0,
  ): Promise<ItemsResponse> {
    if (!this.userId) throw new Error("User not authenticated");
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        StartIndex: startIndex,
        Limit: limit,
        Fields: "PrimaryImageAspectRatio,SortName,PrimaryImageAspectRatio",
        Recursive: true,
        SortBy: "IsFolder,SortName",
        StudioIds: studioId,
        SortOrder: "Ascending",
        ImageTypeLimit: 1,
        IncludeItemTypes: "Movie, Series",
      },
    );
  }

  /**
   * Get all BoxSets (collections) for the current user.
   * @returns ItemsResponse containing all BoxSets.
   */
  async getAllBoxSets(
    limit: number = 20,
    startIndex: number = 0,
  ): Promise<ItemsResponse> {
    if (!this.userId) throw new Error("User not authenticated");
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        // IncludeItemTypes: "BoxSet",
        Recursive: true,
        Fields: "PrimaryImageTag,SortName,ChildCount",
        SortBy: "SortName",
        SortOrder: "Ascending",
        Limit: limit,
        StartIndex: startIndex,
        ParentId: this.collectionsParentId,
      },
    );
  }

  async findBoxSetItemsByChildId(
    itemId: string,
  ): Promise<SearchResponseResult | null> {
    const isMarlinAvailable = await this.isMarlinSearchAvailable();
    if (this.marlinSearchClient && isMarlinAvailable) {
      try {
        const marlinResults = await this.marlinSearchClient.search(itemId, {
          includeItemTypes: "BoxSet",
          attributesToRetrieve: "Id,Name",
        });
        return marlinResults;
      } catch (error) {
        console.warn("MarlinSearch failed. Unable to find BoxSet:", error);
      }
    }
    return null;
  }

  /**
   * Find the first BoxSet (collection) that contains the given item.
   * @param itemId The item ID.
   * @returns The BoxSet MediaItem or null if not found.
   */
  async findBoxSetForItem(item: MediaItem): Promise<MediaItem | null> {
    // 1. Get all BoxSets for the user
    const boxSetsResp = await this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        IncludeItemTypes: "BoxSet",
        Recursive: true,
        Fields: "PrimaryImageTag,SortName",
        SortBy: "SortName",
        SortOrder: "Ascending",
      },
    );
    const boxSets = boxSetsResp.Items ?? [];

    // Get the last word from the item's name (case-insensitive)
    const itemNameWords = item.Name.trim().split(/\s+/);
    // Ignore common words like 'the'
    const ignoreWords = ["the", "captain"];
    let firstWord =
      itemNameWords.find(
        (word) =>
          !ignoreWords.includes(word.toLowerCase()) && isNaN(Number(word)),
      ) ?? itemNameWords[0];
    // Remove trailing colon if present
    firstWord = firstWord.replace(/:$/, "");
    const searchWord = firstWord.toLowerCase();
    const boxSet = boxSets.find((boxSet) => {
      const boxSetNameWords = boxSet.Name.toLowerCase();
      if (boxSetNameWords.includes(searchWord)) {
        return true;
      }
    });

    if (boxSet) {
      return boxSet;
    }
    return null;
  }

  /**
   * Get all movies in a BoxSet (collection).
   * @param collectionId The BoxSet (collection) ID.
   */
  async getBoxSetMovies(collectionId: string): Promise<MediaItem[]> {
    const itemsResp = await this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        ParentId: collectionId,
        IncludeItemTypes: "Movie",
        Recursive: false,
        Fields: "PrimaryImageTag,SortName",
        SortBy: "SortName",
        SortOrder: "Ascending",
      },
    );
    return itemsResp.Items ?? [];
  }

  /**
   * Upload a new user profile image.
   * @param userId The user ID.
   * @param file The image file (File or Blob).
   * @returns Promise<void>
   */
  async uploadUserProfileImage(
    userId: string,
    file: File | Blob,
  ): Promise<void> {
    const url = `${this.serverUrl}/emby/Users/${userId}/Images/Primary`;

    // Compose the authorization header as in the working curl
    const authorization = `MediaBrowser Client="Jellyfin Web", Device="Chrome", DeviceId="${
      this.deviceId
    }", Version="10.10.7", Token="${this.accessToken ?? ""}"`;

    // Read the file as base64 and send as body
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove the data:*/*;base64, prefix if present
        const result = reader.result as string;
        const base64Data = result.split(",")[1] || result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await axios.post(url, base64, {
      headers: {
        accept: "*/*",
        authorization: authorization,
        "content-type": file.type || "application/octet-stream",
        origin: window.location.origin,
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": navigator.userAgent,
      },
      withCredentials: false,
    });
  }

  /**
   * Upload a subtitle file to the server for a video item.
   * @param itemId The video item ID.
   * @param file The subtitle file (File).
   * @param language The language code (default: 'eng').
   * @param isForced Whether the subtitle is forced (default: false).
   * @param isHearingImpaired Whether the subtitle is for hearing impaired (default: false).
   * @returns Promise<void>
   */
  async uploadSubtitleToServer(
    itemId: string,
    file: File,
    language: string = "eng",
    isForced: boolean = false,
    isHearingImpaired: boolean = false,
  ): Promise<void> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(",")[1] || result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const payload = {
      Data: base64,
      Format: file.name.endsWith(".srt") ? "srt" : "vtt",
      IsForced: isForced,
      IsHearingImpaired: isHearingImpaired,
      Language: language,
    };
    await this.makeRequest("post", `/Videos/${itemId}/Subtitles`, payload);
  }

  /**
   * Download a media item by opening the correct download URL in a new tab.
   * Uses the raw serverUrl (not /emby).
   */
  downloadMediaItem(itemId: string) {
    // Use the raw serverUrl (no /emby)
    const serverUrl = this.serverUrl;
    const apiKey = this.accessToken;
    const url =
      `${serverUrl}/Items/${itemId}/Download` +
      (apiKey ? `?api_key=${apiKey}` : "");

    // Open in new tab so cookies/session are sent
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /**
   * Get available localization cultures/languages.
   * @returns Promise<CultureInfo[]> Array of available cultures.
   */
  async getLocalizationCultures(): Promise<CultureInfo[]> {
    return this.makeRequest<CultureInfo[]>("get", "/Localization/cultures");
  }

  /**
   * Search for remote subtitles for a specific item and language.
   * @param itemId The media item ID.
   * @param language The language code (e.g., 'eng', 'spa', 'fra').
   * @returns Promise<RemoteSubtitleInfo[]> Array of available remote subtitles.
   */
  async searchRemoteSubtitles(
    itemId: string,
    language: string,
  ): Promise<RemoteSubtitleInfo[]> {
    return this.makeRequest<RemoteSubtitleInfo[]>(
      "get",
      `/Items/${itemId}/RemoteSearch/Subtitles/${language}`,
    );
  }

  /**
   * Download and add a remote subtitle to an item.
   * @param itemId The media item ID.
   * @param subtitleId The remote subtitle ID.
   * @returns Promise<void>
   */
  async downloadRemoteSubtitle(
    itemId: string,
    subtitleId: string,
  ): Promise<void> {
    await this.makeRequest(
      "post",
      `/Items/${itemId}/RemoteSearch/Subtitles/${subtitleId}`,
    );
  }

  /**
   * Delete a subtitle track from an item.
   * @param itemId The media item ID.
   * @param index The subtitle track index to delete.
   * @returns Promise<void>
   */
  async deleteSubtitleTrack(itemId: string, index: number): Promise<void> {
    await this.makeRequest("delete", `/Videos/${itemId}/Subtitles/${index}`);
  }

  /**
   * Set MarlinSearch configuration and save to localStorage
   */
  setMarlinSearchConfig(url: string, token?: string): void {
    console.log("Setting MarlinSearch config:", url, token);

    const config = {
      baseUrl: url,
      authToken: token,
    };

    const raw = localStorage.getItem("jellyfin_user_settings");
    const parsed = raw ? JSON.parse(raw) : {};
    const updated = {
      ...parsed,
      plugins: {
        ...parsed?.plugins,
        marlinSearch: {
          enabled: true,
          config,
        },
      },
    };
    localStorage.setItem("jellyfin_user_settings", JSON.stringify(updated));
    console.log("Saved to localStorage:", updated);

    // Reinitialize the client
    this.marlinSearchClient = createMarlinSearchClient({
      baseUrl: url,
      authToken: token,
      timeout: 5000,
    });
  }

  /**
   * Remove MarlinSearch configuration
   */
  removeMarlinSearchConfig(): void {
    const raw = localStorage.getItem("jellyfin_user_settings");
    const parsed = raw ? JSON.parse(raw) : {};
    const updated = {
      ...parsed,
      plugins: {
        ...parsed?.plugins,
        marlinSearch: {
          enabled: false,
          config: null,
        },
      },
    };
    localStorage.setItem("jellyfin_user_settings", JSON.stringify(updated));
    this.marlinSearchClient = undefined;
  }

  /**
   * Get all user library views (containers).
   * @returns Promise<ItemsResponse> containing library views.
   */
  async getUserViews(): Promise<ItemsResponse> {
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Views`,
      undefined,
      {},
    );
  }

  /**
   * Initialize library parent IDs by fetching from server.
   * This should be called after successful authentication.
   * Handles dynamic collection types for movies and series.
   */
  async initializeLibraryParentIds(): Promise<void> {
    try {
      const views = await this.getUserViews();

      // Find movies library (can be "movies" or "Movie" collection type)
      const moviesLibrary = views.Items.find(
        (item) => item.CollectionType?.toLowerCase() === "movies",
      );
      if (moviesLibrary?.Id) {
        this.moviesParentId = moviesLibrary.Id;
        localStorage.setItem("jellyfin_movies_parent_id", moviesLibrary.Id);
      }

      // Find series library (can be "tvshows", "series", or similar)
      const seriesLibrary = views.Items.find((item) => {
        const collectionType = item.CollectionType?.toLowerCase();
        return collectionType === "tvshows" || collectionType === "series";
      });
      if (seriesLibrary?.Id) {
        this.seriesParentId = seriesLibrary.Id;
        localStorage.setItem("jellyfin_series_parent_id", seriesLibrary.Id);
      }
      const collectionLibrary = views.Items.find((item) => {
        const collectionType = item.CollectionType?.toLowerCase();
        return collectionType === "collections" || collectionType === "boxsets";
      });
      if (collectionLibrary?.Id) {
        this.collectionsParentId = collectionLibrary.Id;
        localStorage.setItem(
          "jellyfin_collections_parent_id",
          collectionLibrary.Id,
        );
      }
    } catch (error) {
      console.error("Failed to initialize library parent IDs:", error);
    }
  }

  /**
   * Get the stored movies library parent ID.
   * @returns string | undefined
   */
  getMoviesParentId(): string | undefined {
    return this.moviesParentId;
  }

  /**
   * Get the stored series library parent ID.
   * @returns string | undefined
   */
  getSeriesParentId(): string | undefined {
    return this.seriesParentId;
  }

  getMarlinResultId(result: SearchResponseResult | null): string | null {
    return getMarlinResultId(result);
  }

  getMarlinResultTitle(result: SearchResponseResult | null): string | null {
    return getMarlinResultTitle(result);
  }
}

export default JellyfinApi;
