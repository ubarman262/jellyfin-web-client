export interface JellyfinConfig {
  serverUrl: string;
  apiKey?: string;
  userId?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface User {
  Id: string;
  Name: string;
  ServerId: string;
  PrimaryImageTag?: string;
  HasPassword: boolean;
  HasConfiguredPassword: boolean;
  LastLoginDate?: string;
  LastActivityDate?: string;
  Configuration: {
    PlayDefaultAudioTrack: boolean;
    SubtitleLanguagePreference: string;
    DisplayMissingEpisodes: boolean;
    SubtitleMode: string;
    EnableLocalPassword: boolean;
    OrderedViews: string[];
    LatestItemsExcludes: string[];
    MyMediaExcludes: string[];
    HidePlayedInLatest: boolean;
    RememberAudioSelections: boolean;
    RememberSubtitleSelections: boolean;
    EnableNextEpisodeAutoPlay: boolean;
  };
  Policy: {
    IsAdministrator: boolean;
    IsHidden: boolean;
    IsDisabled: boolean;
    MaxParentalRating: number;
    BlockedTags: string[];
    EnableUserPreferenceAccess: boolean;
    BlockUnratedItems: string[];
    EnableRemoteControlOfOtherUsers: boolean;
    EnableSharedDeviceControl: boolean;
    EnableRemoteAccess: boolean;
    EnableLiveTvManagement: boolean;
    EnableLiveTvAccess: boolean;
    EnableMediaPlayback: boolean;
    EnableAudioPlaybackTranscoding: boolean;
    EnableVideoPlaybackTranscoding: boolean;
    EnablePlaybackRemuxing: boolean;
    EnableContentDeletion: boolean;
    EnableContentDownloading: boolean;
    EnableSyncTranscoding: boolean;
    EnableMediaConversion: boolean;
    EnabledDevices: string[];
    EnableAllDevices: boolean;
    EnabledChannels: string[];
    EnableAllChannels: boolean;
    EnabledFolders: string[];
    EnableAllFolders: boolean;
    InvalidLoginAttemptCount: number;
    EnablePublicSharing: boolean;
    RemoteClientBitrateLimit: number;
    AuthenticationProviderId: string;
    ExcludedSubFolders: string[];
    SimultaneousStreamLimit: number;
  };
}

export interface JellyfinAuthResult {
  User: User;
  SessionInfo: {
    PlayState: {
      CanSeek: boolean;
      IsPaused: boolean;
      IsMuted: boolean;
      RepeatMode: string;
    };
    ApplicationVersion: string;
    DeviceName: string;
    DeviceId: string;
    SupportedCommands: string[];
    RemoteEndPoint: string;
    PlayableMediaTypes: string[];
    Id: string;
    ServerId: string;
    UserId: string;
    UserName: string;
    Client: string;
    LastActivityDate: string;
    LastPlaybackCheckIn: string;
    DeviceType: string;
  };
  AccessToken: string;
  ServerId: string;
}

export interface MediaItem {
  Name: string;
  Id: string;
  Type: string;
  ImageTags?: ImageTags;
  BackdropImageTags?: string[];
  ParentBackdropImageTags?: string[];
  ParentPrimaryImageTag?: string;
  ParentBackdropItemId?: string;
  ParentId?: string;
  SeriesName?: string;
  ProductionYear?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  PremiereDate?: string;
  Overview?: string;
  CommunityRating?: number;
  OfficialRating?: string;
  RunTimeTicks?: number;
  MediaType?: string;
  GenreItems?: Array<{ Name: string; Id: string }>;
  SeriesId?: string;
  SeasonId?: string;
  MediaStreams?: MediaStream[];
  Genres?: string[];
  CriticRating?: number;
  People?: Array<People>;
  Profession?: string;
  Studios?: Array<Studios>;
  RemoteTrailers?: Array<{
    Url: string;
  }>;
  UserData: {
    PlaybackPositionTicks?: number;
    Played?: boolean;
    IsFavorite?: boolean;
    IsRated?: boolean;
    PlayCount?: number;
    Key?: string;
    KeyType?: string;
    LastPlayedDate?: string;
    LastPlayedDateTicks?: number;
    LastPlayedDateString?: string;
  };
  ProductionLocations?: string[];
  ProviderIds?: ProviderIds;
}
export interface Studios {
  Name: string;
  Id: string;
}

type PeopleType = "Actor" | "Director" | "Producer" | "Writer";

export interface People {
  Name: string;
  Id: string;
  Role?: string;
  Type?: PeopleType;
  PrimaryImageTag?: string;
  ImageBlurHashes?: {
    Primary?: {
      [size: string]: string;
    };
  };
  SortName?: string;
  Path?: string;
  ProductionYear?: number;
  Overview?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  PremiereDate?: string;
  BirthDate?: string;
  DeathDate?: string;
  IsFavorite?: boolean;
  ExternalUrls?: {
    Name: string;
    Url: string;
  }[];
  ServerId?: string;
  ImageTags?: ImageTags;
  Profession?: string;
  ProductionLocations?: string[];
  ProviderIds?: ProviderIds;
}

export interface ProviderIds {
  Imdb: string;
}

export interface ImageTags {
  Primary?: string;
  Thumb?: string;
  Logo?: string;
  Backdrop?: string;
}

export interface Genre {
  Name: string;
  Id: string;
}

export interface ItemsResponse {
  Items: MediaItem[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface ImageType {
  Primary: "Primary";
  Backdrop: "Backdrop";
  Thumb: "Thumb";
  Logo: "Logo";
}

export interface JellyfinSubtitleStream {
  Codec: string;
  Language: string;
  TimeBase: string;
  Title: string;
  VideoRange: string;
  VideoRangeType: string;
  AudioSpatialFormat: string;
  LocalizedUndefined: string;
  LocalizedDefault: string;
  LocalizedForced: string;
  LocalizedExternal: string;
  LocalizedHearingImpaired: string;
  DisplayTitle: string;
  IsInterlaced: boolean;
  IsAVC: boolean;
  IsDefault: boolean;
  IsForced: boolean;
  IsHearingImpaired: boolean;
  Height: number;
  Width: number;
  Type: string;
  Index: number;
  IsExternal: boolean;
  IsTextSubtitleStream: boolean;
  SupportsExternalStream: boolean;
  Level: number;
}

export interface Items {
  Items: MediaItem[];
}

export interface MediaSource {
  Id: string;
  Path?: string;
  Protocol: "File" | "Http" | "Rtsp" | "Rtmp" | "Udp" | "Rtp" | "Ftp" | "Mms";
  Type?: "Default" | "Group";
  Container?: string;
  Size?: number;
  Name?: string;
  RunTimeTicks?: number;
  ReadAtNativeFramerate?: boolean;
  IsRemote?: boolean;
  ETag?: string;
  IgnoreDts?: boolean;
  IgnoreIndex?: boolean;
  SupportsTranscoding?: boolean;
  SupportsDirectStream?: boolean;
  SupportsDirectPlay?: boolean;
  IsInfiniteStream?: boolean;
  RequiresOpening?: boolean;
  OpenToken?: string;
  RequiresClosing?: boolean;
  LiveStreamId?: string;
  BufferMs?: number;
  RequiresLooping?: boolean;
  SupportsProbing?: boolean;
  MediaStreams?: MediaStream[];
  MediaAttachments?: MediaAttachment[];
  Formats?: string[];
  Bitrate?: number;
  Timestamp?: string;
  RequiredHttpHeaders?: Record<string, string>;
  DirectStreamUrl?: string;
  TranscodingUrl?: string;
  EncoderPath?: string;
  EncoderProtocol?: string;
  DefaultAudioStreamIndex?: number;
  DefaultSubtitleStreamIndex?: number;
}

export interface MediaStream {
  Index: number;
  Codec: string;
  CodecTag?: string;
  Language?: string;
  LanguageCode?: string;
  IsInterlaced?: boolean;
  IsDefault?: boolean;
  IsForced?: boolean;
  Type: "Video" | "Audio" | "Subtitle";
  AspectRatio?: string;
  Channels?: number;
  SampleRate?: number;
  BitRate?: number;
  BitDepth?: number;
  Width?: number;
  Height?: number;
  AverageFrameRate?: number;
  RealFrameRate?: number;
  Profile?: string;
  IsTextSubtitleStream?: string;
  Level?: number;
  IsExternal?: boolean;
  DeliveryMethod?: string;
  DisplayTitle?: string;
  DisplayLanguage?: string;
  NalLengthSize?: string;
  Title?: string;
}

export interface MediaAttachment {
  Codec: string;
  CodecTag?: string;
  Comment?: string;
  Index: number;
  FileName?: string;
  MimeType?: string;
}

export interface MediaSourceResponse {
  MediaSources: MediaSource[];
  PlaySessionId: string;
}
export const DRAWER_PATHS = [
  "/home",
  "/search",
  "/movies",
  "/shows",
  "/favourites",
];
