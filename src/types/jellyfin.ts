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
  ParentLogoImageTag?: string;
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
    Name: string;
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
  Chapters?: Array<{
    Name: string;
    StartPositionTicks: number;
    EndPositionTicks: number;
  }>;
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
  Level?: number;
  IsExternal?: boolean;
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
  "/person",
  "/studio",
  "/collections",
];

export const LANGUAGE_MAP = {
  eng: "English",
  spa: "Spanish",
  fre: "French",
  deu: "German",
  ger: "German",
  ita: "Italian",
  jpn: "Japanese",
  ja: "Japanese",
  chi: "Chinese",
  zho: "Chinese",
  rus: "Russian",
  ara: "Arabic",
  hin: "Hindi",
  por: "Portuguese",
  nld: "Dutch",
  kor: "Korean",
  tur: "Turkish",
  swe: "Swedish",
  pol: "Polish",
  dan: "Danish",
  fin: "Finnish",
  nor: "Norwegian",
  ell: "Greek",
  gre: "Greek",
  heb: "Hebrew",
  tha: "Thai",
  tam: "Tamil",
  tel: "Telugu",
  vie: "Vietnamese",
  hun: "Hungarian",
  ces: "Czech",
  cze: "Czech",
  ron: "Romanian",
  rum: "Romanian",
  bul: "Bulgarian",
  ukr: "Ukrainian",
  srp: "Serbian",
  hrv: "Croatian",
  slk: "Slovak",
  slo: "Slovak",
  slv: "Slovenian",
  est: "Estonian",
  lav: "Latvian",
  lit: "Lithuanian",
  ind: "Indonesian",
  mal: "Malay",
  fil: "Filipino",
  fas: "Persian",
  per: "Persian",
  urd: "Urdu",
  ben: "Bengali",
  mar: "Marathi",
  guj: "Gujarati",
  pan: "Punjabi",
  // Add more as needed
};

export const GENRES = [
  "Halloween",
  "Your Zodiac Watchlist",
  "Hindi",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "English",
  "International",
  "Independent",
  "Comedies",
  "Action",
  "Romance",
  "Dramas",
  "Thriller",
  "Horror",
  "Sci-Fi",
  "Crime",
  "Fantasy",
  "Bollywood",
  "Hollywood",
  "Children & Family",
  "Sports",
  "Award-Winning",
  "Documentaries",
  "Shorts",
  "Stand-Up Comedy",
  "Anime",
];

export const FUNNY_ENDING_LINES = {
  movies: [
    "Wow, you’ve reached the end! That’s all {count} movies we have. 🍿",
    "You scrolled so far, even the credits are rolling. ({count} movies!)",
    "That’s it! {count} movies and not a single popcorn kernel left.",
    "You’ve seen the end of our movie rainbow: {count} treasures found!",
    "No more movies here... unless you know a secret code. ({count} total!)",
    "Congrats! You’ve unlocked the mythical {count}th movie. 🏆",
  ],
  series: [
    "You’ve reached the series finale! That’s all {count} shows we’ve got. 🎬",
    "No more shows left to binge. ({count} total!) Time to touch grass?",
    "You scrolled so far, even the cliffhangers ran out. ({count} shows!)",
    "That’s it! {count} shows and not a single spoiler left.",
    "Congrats! You’ve unlocked the legendary {count}th show. 🏆",
    "No more TV shows here... unless you know a secret code. ({count} total!)",
  ],
};

export const FUNNY_ENDING_LINES_MOVIES = [
  "Wow, you’ve reached the end! That’s all {count} movies we have. 🍿",
  "You scrolled so far, even the credits are rolling. ({count} movies!)",
  "That’s it! {count} movies and not a single popcorn kernel left.",
  "You’ve seen the end of our movie rainbow: {count} treasures found!",
  "No more movies here... unless you know a secret code. ({count} total!)",
  "Congrats! You’ve unlocked the mythical {count}th movie. 🏆",
];

export const FUNNY_ENDING_LINES_SHOWS = [
  "You’ve reached the series finale! That’s all {count} shows we’ve got. 🎬",
  "No more shows left to binge. ({count} total!) Time to touch grass?",
  "You scrolled so far, even the cliffhangers ran out. ({count} shows!)",
  "That’s it! {count} shows and not a single spoiler left.",
  "Congrats! You’ve unlocked the legendary {count}th show. 🏆",
  "No more TV shows here... unless you know a secret code. ({count} total!)",
];

export type MediaType =
  | "latest"
  | "movies"
  | "series"
  | "recommended"
  | "genres"
  | "resume"
  | "nextup"
  | "favourites"
  | "collections";
