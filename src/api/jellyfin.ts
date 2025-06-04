import axios from "axios";
import {
    Items,
    ItemsResponse,
    JellyfinAuthResult,
    JellyfinConfig,
    MediaItem,
    MediaSourceResponse,
    MediaStream,
    UserLogin,
} from "../types/jellyfin";


type ImageUrlProps = {
    itemId: string;
    imageType: string;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
};

class JellyfinApi {
    private readonly serverUrl: string = import.meta.env.VITE_SERVER_URL;
    private readonly apiKey?: string;
    private userId?: string;
    private accessToken?: string;
    private readonly deviceId: string;
    private readonly deviceName: string;
    private readonly clientName: string;
    private readonly clientVersion: string;

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

        // Configure axios defaults
        axios.defaults.timeout = 10000; // 10 second timeout
        axios.defaults.validateStatus = (status) => status >= 200 && status < 300;
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
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
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
        params?: unknown
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
                        "Connection timeout. Please check if the Jellyfin server is accessible."
                    );
                }
                if (!error.response) {
                    throw new Error(
                        `Network error: Unable to connect to Jellyfin server at ${this.serverUrl}. Please verify the server URL and ensure the server is running.`
                    );
                }
                if (error.response.status === 401) {
                    // Clear invalid credentials
                    this.logout();
                    throw new Error("Authentication failed. Please log in again.");
                }
                throw new Error(
                    `Server error: ${error.response.data?.Message ?? error.message}`
                );
            }
            throw error;
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
                }
            );

            // Save auth data
            this.accessToken = response.AccessToken;
            this.userId = response.User.Id;

            localStorage.setItem("jellyfin_access_token", response.AccessToken);
            localStorage.setItem("jellyfin_user_id", response.User.Id);

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
            localStorage.removeItem("jellyfin_access_token");
            localStorage.removeItem("jellyfin_user_id");
        }
    }

    isAuthenticated(): boolean {
        return !!this.accessToken && !!this.userId;
    }

    async getResumeItems(limit: number = 20): Promise<MediaItem[]> {
        return this.makeRequest<ItemsResponse>(
            "get",
            `/Users/${this.userId}/Items/Resume`,
            undefined,
            {
                Limit: limit,
                Fields:
                    "Overview,Genres,PrimaryImageTag,BackdropImageTags,UserData,RemoteTrailers",
            }
        ).then((response) => response.Items);
    }

    async getNextUpItems(limit: number = 20): Promise<MediaItem[]> {
        // Set NextUpDateCutoff to one year ago from now
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        return this.makeRequest<ItemsResponse>("get", `/Shows/NextUp`, undefined, {
            Limit: limit,
            Fields:
                "PrimaryImageAspectRatio,DateCreated,Path,MediaSourceCount,RemoteTrailers",
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
        limit: number = 20
    ): Promise<MediaItem[]> {
        return this.makeRequest<MediaItem[]>(
            "get",
            `/Users/${this.userId}/Items/Latest`,
            undefined,
            {
                IncludeItemTypes: mediaType,
                Limit: limit,
                Fields:
                    "Overview,Genres,PrimaryImageTag,BackdropImageTags,RemoteTrailers",
            }
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
                    "Overview,Genres,PrimaryImageTag,BackdropImageTags,RemoteTrailers",
            }
        );
    }

    async getMediaByType(
        mediaType: string,
        limit: number = 20,
        startIndex: number = 0
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
                Fields:
                    "Overview,Genres,PrimaryImageTag,BackdropImageTags,RemoteTrailers",
            }
        );
    }

    async getFavourites(
        limit: number = 20,
        startIndex: number = 0,
        mediaType?: string
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
                    "Overview,Genres,PrimaryImageTag,BackdropImageTags,RemoteTrailers",
            }
        );
    }

    async getMediaItem(itemId: string): Promise<MediaItem | null> {
        if(itemId === "string")  {
            return new Promise(() => null);
        }
        return this.makeRequest<MediaItem>(
            "get",
            `/Users/${this.userId}/Items/${itemId}`,
            undefined,
            {
                Fields:
                    "Overview,Genres,PrimaryImageTag,BackdropImageTags,MediaStreams,RemoteTrailers",
            }
        );
    }

    async getMediaByGenre(
        genreId: string,
        mediaType: string = "",
        limit: number = 20
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
                Fields: "Overview,Genres,PrimaryImageTag,BackdropImageTags",
            }
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
        limit: number = 100
    ): Promise<ItemsResponse> {
        return this.makeRequest<ItemsResponse>(
            "get",
            `/Users/${this.userId}/Items`,
            undefined,
            {
                SearchTerm: searchTerm,
                Recursive: true,
                Limit: limit,
                Fields: "PrimaryImageAspectRatio,CanDelete,MediaSourceCount",
                IncludeItemTypes: "Movie,Series",
                ImageTypeLimit: 1,
                EnableTotalRecordCount: false,
            }
        );
    }


    getImageUrlProps(props: ImageUrlProps): string {
        let url = `${this.serverUrl}/emby/Items/${props.itemId}/Images/${props.imageType}`;
        const params = new URLSearchParams();
        if(props.maxWidth) params.append("maxWidth", props.maxWidth.toString());
        if (props.maxHeight) params.append("maxHeight", props.maxHeight.toString());
        if (props.quality) params.append("quality", props.quality.toString());
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
    getUserImageUrl(
        userId: string,
        tag?: string,
        quality: number = 90
    ): string {
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




    private getBitrateFromResolution(bitrate: number): (string)[] {
        type ResolutionOption = {
            name: string;
            resolution: string;
            height: number; // used for comparison like "1080", "720"
            minBitrate: number; // in bps
            maxBitrate: number; // in bps
        };

        const resolutions: ResolutionOption[] = [
            {name: "480p", resolution: "854x480", height: 480, minBitrate: 1_000_000, maxBitrate: 4_000_000},
            {name: "720p", resolution: "1280x720", height: 720, minBitrate: 2_500_000, maxBitrate: 7_500_000},
            {name: "1080p", resolution: "1920x1080", height: 1080, minBitrate: 4_000_000, maxBitrate: 12_000_000},
            {name: "1440p", resolution: "2560x1440", height: 1440, minBitrate: 10_000_000, maxBitrate: 24_000_000},
            {name: "2160p", resolution: "3840x2160", height: 2160, minBitrate: 25_000_000, maxBitrate: 60_000_000},
            {name: "8K", resolution: "7680x4320", height: 4320, minBitrate: 50_000_000, maxBitrate: 120_000_000},
        ];

        function getAvailableResolutions(bitrate: number): ResolutionOption[] {
            return resolutions.filter(res =>
                res.height <= bitrate
            );
        }

        const res = getAvailableResolutions(bitrate).reverse()[0];

        return [res.maxBitrate.toString(), res.resolution.split("x")[0], res.resolution.split("x")[1]];
    }

    getPlaybackUrl(
        itemId: string,
        audioStreamIndex: number = 0,
        subtitles: MediaStream[],
        selectedSubtitleIndex: number | null,
        directPlay: boolean,
        bitrate?: number
    ): string {
        const resolution = bitrate ? this.getBitrateFromResolution(bitrate) : undefined;
        const defaultVideoBitrate = "139616000";
        const videoBitrate = resolution ? resolution[0] : defaultVideoBitrate;

        const params = new URLSearchParams({
            DeviceId: this.deviceId,
            MediaSourceId: itemId,
            api_key: this.accessToken ?? "",
            VideoCodec: "av1,hevc,h264,vp9",
            AudioCodec: "aac",
            AudioStreamIndex: audioStreamIndex.toString(),
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
            "h264-rangetype": "SDR",
            "h264-deinterlace": "true",
            "av1-profile": "main",
            "av1-rangetype": "SDR,HDR10,HLG",
            "av1-level": "19",
            "vp9-rangetype": "SDR,HDR10,HLG",
            "hevc-profile": "main,main10",
            "hevc-rangetype": "SDR,HDR10,HLG",
            "hevc-level": "183",
            "hevc-deinterlace": "true",
            TranscodingProtocol: "hls",
            TranscodingContainer: "ts",
            VideoBitrate: videoBitrate
        });

        // Add resolution constraints if available
        if (resolution) {
            params.set("maxWidth", resolution[2]);
            params.set("maxHeight", resolution[1]);
        }

        // Add transcode reasons for non-direct play
        if (!directPlay) {
            params.set("TranscodeReasons", "ContainerNotSupported, AudioCodecNotSupported");
        }


        if (selectedSubtitleIndex !== null && subtitles.length > 0) {
            const selectedSubtitle = subtitles.find(s => s.Index === selectedSubtitleIndex);

            if (selectedSubtitle && !selectedSubtitle.IsTextSubtitleStream) {
                params.set("SubtitleStreamIndex", selectedSubtitleIndex.toString());
                params.set("SubtitleMethod", "Encode");

                const currentReasons = params.get("TranscodeReasons") ?? "";
                const updatedReasons = currentReasons
                    ? `${currentReasons}, SubtitleCodecNotSupported`
                    : "SubtitleCodecNotSupported";

                params.set("TranscodeReasons", updatedReasons);
            }
        }


        return `${this.serverUrl}/videos/${itemId}/main.m3u8?${params.toString()}`;
    }


    async fetchSubtitleTracks(item: MediaItem): Promise<MediaStream[]> {
        const response = await this.makeRequest<MediaSourceResponse>(
            "post",
            `/Items/${item.Id}/PlaybackInfo?api_key=${this.accessToken}`,
            JSON.stringify({
                MediaSourceId: item.Id,
                DeviceId: this.deviceId,
            })
        );

        // Safely access MediaStreams and filter by Type === 'Subtitle'
        const subtitles =
            response?.MediaSources?.[0]?.MediaStreams?.filter(
                (stream) => stream.Type === "Subtitle"
            ) ?? []; // fallback to empty array if undefined

        return subtitles;
    }

    async fetchSelectedSubtitle(
        itemId: string,
        subtitleStreamIndex: number
    ): Promise<[]> {
        const endpoint = `/Videos/${itemId}/${itemId}/Subtitles/${subtitleStreamIndex}/0/Stream.js`;
        const response = await this.makeRequest<{
            TrackEvents: [];
        }>("get", endpoint, undefined, {
            api_key: this.accessToken,
        });
        return response.TrackEvents;
    }

    async reportPlaybackProgress(
        itemId: string,
        positionSeconds: number,
        audioStreamIndex?: number,
        subtitleStreamIndex?: number
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
                : [{Id: itemId, PlaylistItemId: "playlistItem0"}],
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
            }
        );
    }

    /**
     * Get next up episodes for a specific series.
     * @param seriesId The series ID.
     * @param limit Optional limit for number of episodes.
     */
    async getSeriesNextUp(
        seriesId: string,
        limit: number = 10
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
            }
        );
        return data.Items ?? [];
    }

  /**
   * Get all episodes for a given series and season.
   * @param seriesId The series ID.
   * @param seasonId The season ID.
   */
  async getEpisodes(seriesId: string, seasonId: string | undefined): Promise<MediaItem[]> {
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
      }
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
            {DatePlayed: date}
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
            `/Users/${this.userId}/PlayedItems/${itemId}`
        );
    }

    /**
     * Mark or unmark an item as a favorite for the current user.
     * @param itemId The item ID to mark as favorite.
     * @param isFavorite Whether to mark as favorite (true) or remove from favorites (false).
     */
    async markAsFavourite(
        itemId: string,
        isFavorite: boolean = true
    ): Promise<void> {
        if (!this.userId) throw new Error("User not authenticated");
        if (isFavorite) {
            await this.makeRequest(
                "post",
                `/Users/${this.userId}/FavoriteItems/${itemId}`
            );
        } else {
            await this.makeRequest(
                "delete",
                `/Users/${this.userId}/FavoriteItems/${itemId}`
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
            }
        );
    }

  /**
   * Get similar items for a given item.
   * @param itemId The item ID to find similar items for.
   * @param limit Number of similar items to fetch.
   */
  async getSimilarItems(itemId: string, limit: number = 12): Promise<ItemsResponse> {
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Items/${itemId}/Similar`,
      undefined,
      {
        userId: this.userId,
        limit,
        fields: "PrimaryImageAspectRatio,CanDelete",
      }
    );
  }

  /**
   * Get search suggestions for the current user.
   * Returns a mix of Movies, Series, and MusicArtists.
   * @param limit Number of suggestions to fetch (default: 20)
   */
  async getSearchSuggestions(limit: number = 20): Promise<ItemsResponse> {
    if (!this.userId) throw new Error("User not authenticated");
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Items`,
      undefined,
      {
        userId: this.userId,
        limit,
        recursive: true,
        includeItemTypes: ["Movie", "Series"].join(","),
        sortBy: ["IsFavoriteOrLiked", "Random"].join(","),
        imageTypeLimit: 0,
        enableTotalRecordCount: false,
        enableImages: false,
      }
    );
  }
}

export default JellyfinApi;
