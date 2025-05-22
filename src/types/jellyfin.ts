export interface JellyfinConfig {
  serverUrl: string;
  apiKey?: string;
  userId?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface JellyfinUser {
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
    AccessSchedules: any[];
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
  User: JellyfinUser;
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
  ImageTags?: {
    Primary?: string;
    Thumb?: string;
    Logo?: string;
    Backdrop?: string;
  };
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
}

export interface Studios {
  Name: string;
  Id: string;
}

export interface People {
  Name: string;
  Type: string;
  Id: string;
  PrimaryImageTag?: string;
  Role?: string;
  CharacterName?: string;
  IsCast: boolean;
  IsDirector: boolean;
  IsWriter: boolean;
  IsProducer: boolean;
  IsGuestStar: boolean;
  IsGuestDirector: boolean;
  IsGuestWriter: boolean;
  IsGuestProducer: boolean;
  IsGuest: boolean;
  IsCrew: boolean;
  IsGuestCrew: boolean;
}

export interface MediaStream {
  Codec: string;
  Language: string;
  Type: string;
  Index: number;
  DisplayTitle: string;
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
