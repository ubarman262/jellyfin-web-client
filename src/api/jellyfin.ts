import axios from "axios";
import {
  ItemsResponse,
  JellyfinAuthResult,
  JellyfinConfig,
  JellyfinSubtitleStream,
  MediaItem,
  UserLogin,
} from "../types/jellyfin";

class JellyfinApi {
  private readonly serverUrl: string;
  private readonly apiKey?: string;
  private userId?: string;
  private accessToken?: string;
  private readonly deviceId: string;
  private readonly deviceName: string;
  private readonly clientName: string;
  private readonly clientVersion: string;

  constructor(config: JellyfinConfig) {
    // Ensure server URL is properly formatted
    this.serverUrl =
      this.normalizeServerUrl(config.serverUrl) || "http://192.168.0.140:8096";
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
    method: "get" | "post",
    endpoint: string,
    data?: any,
    params?: any
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
        Fields: "Overview,Genres,PrimaryImageTag,BackdropImageTags,UserData",
      }
    ).then((response) => response.Items);
  }

  async getNextUpItems(limit: number = 20): Promise<MediaItem[]> {
    // Set NextUpDateCutoff to one year ago from now
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return this.makeRequest<ItemsResponse>("get", `/Shows/NextUp`, undefined, {
      Limit: limit,
      Fields: "PrimaryImageAspectRatio,DateCreated,Path,MediaSourceCount",
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
        Fields: "Overview,Genres,PrimaryImageTag,BackdropImageTags",
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
        Fields: "Overview,Genres,PrimaryImageTag,BackdropImageTags",
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
        Fields: "Overview,Genres,PrimaryImageTag,BackdropImageTags",
      }
    );
  }

  async getMediaItem(itemId: string): Promise<MediaItem> {
    return this.makeRequest<MediaItem>(
      "get",
      `/Users/${this.userId}/Items/${itemId}`,
      undefined,
      {
        Fields:
          "Overview,Genres,PrimaryImageTag,BackdropImageTags,MediaStreams",
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

  async search(searchTerm: string, limit: number = 20): Promise<ItemsResponse> {
    return this.makeRequest<ItemsResponse>(
      "get",
      `/Users/${this.userId}/Items`,
      undefined,
      {
        SearchTerm: searchTerm,
        Recursive: true,
        Limit: limit,
        Fields: "Overview,Genres,PrimaryImageTag,BackdropImageTags",
        IncludeItemTypes: "Movie,Series,Episode",
      }
    );
  }

  getImageUrl(
    itemId: string,
    imageType: string = "Primary",
    maxWidth?: number,
    maxHeight?: number
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

  async fetchSubtitleTracks(
    item: MediaItem
  ): Promise<JellyfinSubtitleStream[]> {
    const response = await this.makeRequest<unknown>(
      "post",
      `/Items/${item.Id}/PlaybackInfo?api_key=${this.accessToken}`,
      JSON.stringify({
        MediaSourceId: item.Id,
        DeviceId: this.deviceId,
      })
    );
    // response is already parsed JSON from makeRequest
    const subtitles = response?.MediaSources?.[0]?.MediaStreams?.filter(
      (stream: MediaStream) => stream.Type === "Subtitle"
    );
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
        AudioStreamIndex: typeof audioStreamIndex === "number" ? audioStreamIndex : 0,
        SubtitleStreamIndex: typeof subtitleStreamIndex === "number" ? subtitleStreamIndex : 0,
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
    await this.makeRequest(
      "post",
      "/Sessions/Playing",
      {
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
      }
    );
  }
}

export default JellyfinApi;
