import * as Popover from "@radix-ui/react-popover";
import * as Slider from "@radix-ui/react-slider";
import Hls from "hls.js";
import {
  ArrowLeft,
  Check,
  ListVideo,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useAuth } from "../../../context/AuthContext";
import EpisodesList from "../EpisodesList";

/**
 * Reusable Jellyfin video player.
 *
 * Streams an item from a Jellyfin server via HLS (with native fallback on Safari),
 * and exposes UI to switch the active audio track and subtitle track.
 *
 * Audio switching is done by re-requesting the HLS stream with a different
 * AudioStreamIndex (Jellyfin transcodes/remuxes per audio selection) and
 * resuming playback at the same position. Text subtitles are loaded as
 * external WebVTT tracks so they can be toggled without restarting the stream.
 */

export interface JellyfinPlayerProps {
  /** Base URL of the Jellyfin server, e.g. "https://jellyfin.example.com". No trailing slash required. */
  serverUrl: string;
  /** Jellyfin item id (a movie, episode, etc.). */
  itemId: string;
  /** Jellyfin user id making the request. */
  userId: string;
  /** Jellyfin access token (from /Users/AuthenticateByName) or API key. */
  accessToken: string;
  /** Optional stable device id. A random one is generated if omitted. */
  deviceId?: string;
  /** Optional max streaming bitrate (bits per second). Defaults to 20 Mbps. */
  maxStreamingBitrate?: number;
  /** Autoplay when ready. */
  autoPlay?: boolean;
  /** Resume position in seconds. */
  startPositionSeconds?: number;
  className?: string;
  /** Optional title shown at the top of the overlay. */
  title?: string;
  /** Optional subtitle (e.g. "Season 9, Ep. 4 — Title") shown under the title. */
  subtitle?: string;
  /** Render the close button in the top-right. Defaults to true. */
  showCloseButton?: boolean;
  /** Render the back button in the top-left. Defaults to true. */
  showBackButton?: boolean;
  /** Parent callback for the close button. */
  onClose?: () => void;
  /** Parent callback for the back button. */
  onBack?: () => void;
  /** Feature toggles — set any to `false` to hide/disable the corresponding control. All default to `true`. */
  enableAudioTracks?: boolean;
  enableSubtitles?: boolean;
  enableQualitySelector?: boolean;
  enableEpisodes?: boolean;
  enablePictureInPicture?: boolean;
  enableFullscreen?: boolean;
  enableSkipButtons?: boolean;
  enableVolumeControl?: boolean;
  enableProgressBar?: boolean;
  enableTitle?: boolean;
  enableCenterControls?: boolean;
  enableBufferingIndicator?: boolean;
  enableSessionReporting?: boolean;
  enableAutoHideControls?: boolean;
  enableResume?: boolean;
  /** X-Ray panel (cast & crew / scene info, Prime Video style). */
  enableXRay?: boolean;
}

interface MediaStream {
  Index: number;
  Type: "Audio" | "Subtitle" | "Video" | string;
  Codec?: string;
  Language?: string;
  DisplayTitle?: string;
  IsDefault?: boolean;
  IsExternal?: boolean;
  IsTextSubtitleStream?: boolean;
  DeliveryUrl?: string;
  DeliveryMethod?: "External" | "Encode" | "Embed" | string;
}

interface MediaSource {
  Id: string;
  Container?: string;
  MediaStreams: MediaStream[];
  DefaultAudioStreamIndex?: number;
  DefaultSubtitleStreamIndex?: number;
  TranscodingUrl?: string;
}

interface PlaybackInfoResponse {
  MediaSources: MediaSource[];
  PlaySessionId: string;
}

interface ItemUserData {
  PlaybackPositionTicks?: number;
  AudioStreamIndex?: number | null;
  SubtitleStreamIndex?: number | null;
}

type SubtitleStyleOption = "default" | "box" | "shadow";
type SubtitleSizeOption = "small" | "medium" | "large";

const SUBTITLE_STYLE_KEY = "jellyfin-player-subtitle-style";
const SUBTITLE_SIZE_KEY = "jellyfin-player-subtitle-size";

const SUBTITLE_STYLE_PRESETS: Record<
  SubtitleStyleOption,
  {
    label: string;
    background: string;
    textShadow: string;
    padding: string;
    borderRadius: string;
  }
> = {
  default: {
    label: "Default",
    background: "rgba(0, 0, 0, 0.47)",
    textShadow: "0 1px 1px rgba(0, 0, 0, 0.8)",
    padding: "0.25em 0.5em",
    borderRadius: "0.35rem",
  },
  box: {
    label: "Box",
    background: "rgba(0, 0, 0, 0.85)",
    textShadow: "0 0 0 rgba(0,0,0,0)",
    padding: "0.3em 0.6em",
    borderRadius: "0.5rem",
  },
  shadow: {
    label: "Shadow",
    background: "transparent",
    textShadow: "0 2px 3px rgba(0, 0, 0, 0.85)",
    padding: "0",
    borderRadius: "0",
  },
};

const SUBTITLE_SIZE_PRESETS: Record<
  SubtitleSizeOption,
  { label: string; fontSize: string }
> = {
  small: { label: "Small", fontSize: "18px" },
  medium: { label: "Medium", fontSize: "26px" },
  large: { label: "Large", fontSize: "34px" },
};

const BOTTOM_CONTROL_ICON_CLASS = "h-6 w-6";

interface ItemResponse {
  Id?: string;
  UserData?: ItemUserData;
  Type?: string;
  Name?: string;
  SeriesId?: string;
  SeriesName?: string;
  SeasonId?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ProductionYear?: number;
  Overview?: string;
  Genres?: string[];
  People?: Person[];
  Studios?: { Name?: string; Id?: string }[];
  CommunityRating?: number;
  OfficialRating?: string;
  RunTimeTicks?: number;
  BackdropImageTags?: string[];
  ParentBackdropImageTags?: string[];
  ImageTags?: { Primary?: string };
}

interface Person {
  Id: string;
  Name?: string;
  Role?: string;
  Type?: "Actor" | "Director" | "Writer" | "Producer" | "GuestStar" | string;
  PrimaryImageTag?: string;
}

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function streamLabel(s: MediaStream) {
  const parts: string[] = [];

  const displayTitle = s.DisplayTitle?.trim();
  if (displayTitle) {
    const cleanedParts = displayTitle
      .split(/[-–—]/)
      .map((part) => part.trim())
      .filter((part) => part && !/^(undefined|null|none|unknown)$/i.test(part));

    if (cleanedParts.length > 0) {
      parts.push(...cleanedParts);
    }
  }

  if (parts.length === 0) {
    if (s.Language) parts.push(s.Language);
    if (s.Codec) parts.push(s.Codec.toUpperCase());
  }

  if (s.IsDefault) parts.push("Default");

  return parts.join(" · ") || `Track ${s.Index}`;
}

function normalizeTrackText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type HlsAudioTrackLike = {
  id?: number;
  name?: string;
  lang?: string;
};

function selectHlsAudioTrack(
  hls: Hls,
  selected: MediaStream | undefined,
  audioStreams: MediaStream[],
) {
  if (!selected || hls.audioTracks.length < 2) return false;

  const tracks = hls.audioTracks as HlsAudioTrackLike[];
  const selectedLabel = normalizeTrackText(streamLabel(selected));
  const selectedLanguage = normalizeTrackText(selected.Language);

  let match = tracks.findIndex((track) => track.id === selected.Index);

  if (match < 0 && selectedLabel) {
    match = tracks.findIndex((track) => {
      const name = normalizeTrackText(track.name);
      return (
        name === selectedLabel ||
        name.includes(selectedLabel) ||
        selectedLabel.includes(name)
      );
    });
  }

  if (match < 0 && selectedLanguage) {
    const languageMatches = tracks
      .map((track, index) => ({ index, lang: normalizeTrackText(track.lang) }))
      .filter((track) => track.lang === selectedLanguage);
    if (languageMatches.length === 1) match = languageMatches[0].index;
  }

  if (match < 0) {
    const streamOrder = audioStreams.findIndex(
      (stream) => stream.Index === selected.Index,
    );
    if (streamOrder >= 0 && streamOrder < tracks.length) match = streamOrder;
  }

  if (match < 0) return false;
  hls.audioTrack = match;
  return true;
}

export function JellyfinPlayer({
  serverUrl,
  itemId,
  userId,
  accessToken,
  deviceId,
  maxStreamingBitrate = 20_000_000,
  autoPlay = true,
  startPositionSeconds = 0,
  className,
  title,
  subtitle,
  showCloseButton = true,
  showBackButton = true,
  onClose,
  onBack,
  enableAudioTracks = true,
  enableSubtitles = true,
  enableQualitySelector = true,
  enableEpisodes = true,
  enablePictureInPicture = true,
  enableFullscreen = true,
  enableSkipButtons = true,
  enableVolumeControl = true,
  enableProgressBar = true,
  enableTitle = true,
  enableCenterControls = true,
  enableBufferingIndicator = true,
  enableSessionReporting = true,
  enableAutoHideControls = true,
  enableResume = true,
  enableXRay = true,
}: JellyfinPlayerProps) {
  const { api } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stableDeviceId = useMemo(() => deviceId ?? randomId(), [deviceId]);
  // Internal "currently playing" item id — initialized from the prop, but the
  // user can switch to a sibling episode via the episodes panel without the
  // parent having to re-mount.
  const [activeItemId, setActiveItemId] = useState(itemId);
  useEffect(() => {
    setActiveItemId(itemId);
  }, [itemId]);

  // When switching to a different episode internally, the next attach should
  // resume from that episode's saved position, not keep currentTime from the
  // previous episode.
  useEffect(() => {
    initialResumeApplied.current = false;
    // Clear any resume position carried over from the previous episode; the
    // new episode's saved UserData (if any) will set this before attach.
    setResumeSeconds(startPositionSeconds);
    // Also reset live video time so the attach for the new episode doesn't
    // briefly seek to the previous episode's currentTime.
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {
        /* noop */
      }
    }
  }, [activeItemId, startPositionSeconds]);

  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfoResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Series/episodes metadata. Populated when the current item is an Episode.
  const [itemMeta, setItemMeta] = useState<ItemResponse | null>(null);
  const [previousEpisode, setPreviousEpisode] = useState<ItemResponse | null>(
    null,
  );
  const [nextEpisode, setNextEpisode] = useState<ItemResponse | null>(null);
  // Episode navigation should begin at the start instead of resuming a saved
  // position from the episode being left.
  const [startFromBeginningItemId, setStartFromBeginningItemId] = useState<
    string | null
  >(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [episodesPanelMounted, setEpisodesPanelMounted] = useState(false);
  const [episodesPanelVisible, setEpisodesPanelVisible] = useState(false);
  const [showXRay, setShowXRay] = useState(false);
  const episodesOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showEpisodes) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        episodesOverlayRef.current &&
        !episodesOverlayRef.current.contains(event.target as Node)
      ) {
        setShowEpisodes(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showEpisodes]);

  useEffect(() => {
    if (showEpisodes) {
      setEpisodesPanelMounted(true);
      return;
    }

    setEpisodesPanelVisible(false);
    const timer = setTimeout(() => setEpisodesPanelMounted(false), 300);
    return () => clearTimeout(timer);
  }, [showEpisodes]);

  useEffect(() => {
    if (!showEpisodes || !episodesPanelMounted) return;

    // Wait until the off-screen panel has been committed before changing its
    // transform, otherwise subsequent opens can skip the transition.
    const frame = requestAnimationFrame(() => setEpisodesPanelVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [showEpisodes, episodesPanelMounted]);

  const baseUrl = useMemo(() => serverUrl.replace(/\/+$/, ""), [serverUrl]);

  // Derived on-screen title/subtitle. Props override auto-discovered metadata.
  const displayTitle = useMemo(() => {
    if (title) return title;
    if (!itemMeta) return undefined;
    if (itemMeta.Type === "Episode" && itemMeta.SeriesName)
      return itemMeta.SeriesName;
    return itemMeta.Name;
  }, [title, itemMeta]);

  const displaySubtitle = useMemo(() => {
    if (subtitle) return subtitle;
    if (!itemMeta) return undefined;
    if (itemMeta.Type === "Episode") {
      const season = itemMeta.ParentIndexNumber ?? 0;
      const episode = itemMeta.IndexNumber ?? 0;
      return `S${season} E${episode}${itemMeta.Name ? ` — ${itemMeta.Name}` : ""}`;
    }
    if (itemMeta.ProductionYear) return String(itemMeta.ProductionYear);
    return undefined;
  }, [subtitle, itemMeta]);

  const backdropUrl = useMemo(() => {
    if (!itemMeta?.Id || !baseUrl) return null;
    const backdropTag =
      itemMeta.BackdropImageTags?.[0] ?? itemMeta.ParentBackdropImageTags?.[0];
    if (backdropTag) {
      return `${baseUrl}/Items/${itemMeta.Id}/Images/Backdrop?fillHeight=1080&fillWidth=1920&tag=${encodeURIComponent(backdropTag)}`;
    }
    const primaryTag = itemMeta.ImageTags?.Primary;
    if (primaryTag) {
      return `${baseUrl}/Items/${itemMeta.Id}/Images/Primary?fillHeight=1080&fillWidth=720&tag=${encodeURIComponent(primaryTag)}`;
    }
    return null;
  }, [baseUrl, itemMeta]);

  const [audioIndex, setAudioIndex] = useState<number | null>(null);
  const [subtitleIndex, setSubtitleIndex] = useState<number | null>(null);
  const [activeSubtitleSrc, setActiveSubtitleSrc] = useState<string | null>(
    null,
  );
  const [subtitleStyle, setSubtitleStyle] =
    useState<SubtitleStyleOption>("default");
  const [subtitleSize, setSubtitleSize] =
    useState<SubtitleSizeOption>("medium");
  const [bitrate, setBitrate] = useState<number | undefined>(undefined);
  const [appliedAudioIndex, setAppliedAudioIndex] = useState<number | null>(
    null,
  );
  // Resume position (seconds) discovered from the server's saved UserData for
  // this user+item. Used once, on the first source attach, so re-attaches
  // triggered by audio/quality switches keep the live currentTime instead.
  const [resumeSeconds, setResumeSeconds] =
    useState<number>(startPositionSeconds);
  const initialResumeApplied = useRef(false);

  useEffect(() => {
    try {
      const savedStyle = localStorage.getItem(
        SUBTITLE_STYLE_KEY,
      ) as SubtitleStyleOption | null;
      const savedSize = localStorage.getItem(
        SUBTITLE_SIZE_KEY,
      ) as SubtitleSizeOption | null;
      if (savedStyle && SUBTITLE_STYLE_PRESETS[savedStyle]) {
        setSubtitleStyle(savedStyle);
      }
      if (savedSize && SUBTITLE_SIZE_PRESETS[savedSize]) {
        setSubtitleSize(savedSize);
      }
    } catch {
      // ignore localStorage failures
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SUBTITLE_STYLE_KEY, subtitleStyle);
    } catch {
      /* ignore */
    }
  }, [subtitleStyle]);

  useEffect(() => {
    try {
      localStorage.setItem(SUBTITLE_SIZE_KEY, subtitleSize);
    } catch {
      /* ignore */
    }
  }, [subtitleSize]);

  const authHeader = useMemo(
    () =>
      `MediaBrowser Client="JellyfinPlayer", Device="Web", DeviceId="${stableDeviceId}", Version="1.0.0", Token="${accessToken}"`,
    [accessToken, stableDeviceId],
  );

  // Fetch PlaybackInfo (lists audio + subtitle streams and a transcoding URL).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPlaybackInfo(null);

    const body = {
      UserId: userId,
      MaxStreamingBitrate: maxStreamingBitrate,
      StartTimeTicks: Math.floor(startPositionSeconds * 10_000_000),
      EnableDirectPlay: true,
      EnableDirectStream: true,
      EnableTranscoding: true,
      AllowVideoStreamCopy: true,
      AllowAudioStreamCopy: true,
      AutoOpenLiveStream: true,
    };

    fetch(
      `${baseUrl}/Items/${activeItemId}/PlaybackInfo?userId=${encodeURIComponent(userId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`PlaybackInfo failed (${res.status})`);
        return (await res.json()) as PlaybackInfoResponse;
      })
      .then(async (info) => {
        if (cancelled) return;
        setPlaybackInfo(info);
        const src = info.MediaSources?.[0];
        // Fetch the item to read UserData (saved playback position, last
        // audio/subtitle selection). Jellyfin persists these whenever the
        // client reports /Sessions/Playing* events, so on subsequent loads
        // this is what we resume from.
        let userData: ItemUserData | undefined;
        let itemJson: ItemResponse | undefined;
        try {
          const itemRes = await fetch(
            `${baseUrl}/Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(activeItemId)}?fields=${encodeURIComponent("People,Genres,Studios,Overview,Taglines")}`,
            { headers: { Authorization: authHeader } },
          );
          if (itemRes.ok) {
            itemJson = (await itemRes.json()) as ItemResponse;
            userData = itemJson.UserData;
          }
        } catch {
          /* non-fatal */
        }
        if (cancelled) return;
        setItemMeta(itemJson ?? null);
        if (src) {
          const savedAudio = userData?.AudioStreamIndex;
          const savedSubtitle = userData?.SubtitleStreamIndex;
          const defaultAudio =
            (savedAudio != null ? savedAudio : undefined) ??
            src.DefaultAudioStreamIndex ??
            src.MediaStreams.find((s) => s.Type === "Audio")?.Index ??
            null;
          setAudioIndex(defaultAudio);
          setSubtitleIndex(
            savedSubtitle != null
              ? savedSubtitle === -1
                ? null
                : savedSubtitle
              : (src.DefaultSubtitleStreamIndex ?? null),
          );
        }
        const savedTicks = userData?.PlaybackPositionTicks;
        if (
          enableResume &&
          startFromBeginningItemId !== activeItemId &&
          savedTicks &&
          savedTicks > 0
        ) {
          const seconds = savedTicks / 10_000_000;
          setResumeSeconds(Math.max(seconds, startPositionSeconds));
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load media");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    authHeader,
    baseUrl,
    activeItemId,
    userId,
    maxStreamingBitrate,
    startPositionSeconds,
    enableResume,
    startFromBeginningItemId,
  ]);

  const mediaSource = playbackInfo?.MediaSources?.[0];

  const seriesId = itemMeta?.Type === "Episode" ? itemMeta.SeriesId : undefined;

  // Load siblings in the current season so the player can expose previous and
  // next episode controls without changing the route or unmounting playback.
  useEffect(() => {
    if (
      itemMeta?.Type !== "Episode" ||
      !itemMeta.SeriesId ||
      !itemMeta.SeasonId
    ) {
      setPreviousEpisode(null);
      setNextEpisode(null);
      return;
    }

    let cancelled = false;
    const url = new URL(`/Shows/${itemMeta.SeriesId}/Episodes`, `${baseUrl}/`);
    url.searchParams.set("SeasonId", itemMeta.SeasonId);
    url.searchParams.set("UserId", userId);
    url.searchParams.set("SortBy", "IndexNumber");
    url.searchParams.set("SortOrder", "Ascending");

    fetch(url, { headers: { Authorization: authHeader } })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Episode list failed (${response.status})`);
        return (await response.json()) as { Items?: ItemResponse[] };
      })
      .then(({ Items = [] }) => {
        if (cancelled) return;
        const currentIndex = Items.findIndex(
          (episode) => episode.Id === activeItemId,
        );
        setPreviousEpisode(currentIndex > 0 ? Items[currentIndex - 1] : null);
        setNextEpisode(
          currentIndex >= 0 && currentIndex < Items.length - 1
            ? Items[currentIndex + 1]
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPreviousEpisode(null);
          setNextEpisode(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeItemId,
    authHeader,
    baseUrl,
    itemMeta?.SeasonId,
    itemMeta?.SeriesId,
    itemMeta?.Type,
    userId,
  ]);

  const audioStreams = useMemo(
    () => mediaSource?.MediaStreams.filter((s) => s.Type === "Audio") ?? [],
    [mediaSource],
  );
  const subtitleStreams = useMemo(
    () => mediaSource?.MediaStreams.filter((s) => s.Type === "Subtitle") ?? [],
    [mediaSource],
  );

  const selectedSubtitle = useMemo(
    () => subtitleStreams.find((s) => s.Index === subtitleIndex),
    [subtitleIndex, subtitleStreams],
  );

  const subtitleCueStyle = useMemo(() => {
    const stylePreset = SUBTITLE_STYLE_PRESETS[subtitleStyle];
    const sizePreset = SUBTITLE_SIZE_PRESETS[subtitleSize];
    return {
      "--subtitle-bg-color": stylePreset.background,
      "--subtitle-color": "white",
      "--subtitle-text-shadow": stylePreset.textShadow,
      "--subtitle-padding": stylePreset.padding,
      "--subtitle-border-radius": stylePreset.borderRadius,
      "--subtitle-font-size": sizePreset.fontSize,
    } as CSSProperties;
  }, [subtitleStyle, subtitleSize]);

  // Build the streaming URL for the currently selected audio track.
  // We always rebuild from /Videos/{id}/master.m3u8 (never reuse
  // PlaybackInfo.TranscodingUrl, which bakes in the original audio choice)
  // and attach a fresh PlaySessionId per audio selection so Jellyfin starts
  // a clean transcode for the requested AudioStreamIndex.
  const streamUrl = useMemo(() => {
    if (!api || !activeItemId) return null;
    return api.getPlaybackUrl(
      activeItemId,
      audioIndex ?? 0,
      bitrate
    );
  }, [api, activeItemId, audioIndex, bitrate]);

  const subtitleRequestUrl = useCallback(
    (stream: MediaStream) => {
      if (stream.DeliveryUrl) {
        const url = new URL(stream.DeliveryUrl, `${baseUrl}/`);
        url.searchParams.set("api_key", accessToken);
        return url.toString();
      }
      return api?.getVTTStream(activeItemId, stream.Index) ?? "";
    },
    [api, activeItemId, baseUrl, accessToken],
  );

  // Attach the HLS stream. Re-run when the audio selection (and therefore URL) changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // On first attach, resume from the server-side saved position
    // (UserData.PlaybackPositionTicks). On subsequent attaches (audio /
    // quality switches) keep the live currentTime so the switch is seamless.
    const liveTime = video.currentTime;
    const resumeAt = initialResumeApplied.current
      ? liveTime > 0
        ? liveTime
        : resumeSeconds
      : resumeSeconds;
    initialResumeApplied.current = true;
    const wasPlaying = !video.paused;

    const cleanupHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    cleanupHls();

    const onLoaded = () => {
      if (resumeAt > 0) video.currentTime = resumeAt;
      if (wasPlaying || autoPlay) void video.play().catch(() => {});
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      const verifyAudio = () => {
        const selectedAudio = audioStreams.find(
          (stream) => stream.Index === audioIndex,
        );
        // When the server transcodes for the requested AudioStreamIndex,
        // the HLS manifest typically exposes a single audio rendition —
        // that's the verification that our requested track is what's
        // actually playing. If multiple renditions exist (e.g. direct
        // stream), fall back to switching at the HLS layer.
        if (hls.audioTracks.length > 1) {
          selectHlsAudioTrack(hls, selectedAudio, audioStreams);
        }
        setAppliedAudioIndex(audioIndex);
      };
      hls.once(Hls.Events.MANIFEST_PARSED, () => {
        verifyAudio();
        onLoaded();
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, verifyAudio);
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, verifyAudio);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setError(`Playback error: ${data.details}`);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari/iOS).
      video.src = streamUrl;
      video.addEventListener(
        "loadedmetadata",
        () => {
          setAppliedAudioIndex(audioIndex);
          onLoaded();
        },
        { once: true },
      );
    } else {
      setError("HLS is not supported in this browser.");
    }

    return cleanupHls;
    // startPositionSeconds intentionally excluded — only used on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, autoPlay, resumeSeconds]);

  // Fetch the selected subtitle as a blob URL so browser text tracks do not get
  // blocked by cross-origin <track> requests or missing auth headers.
  useEffect(() => {
    if (!selectedSubtitle || !mediaSource) {
      setActiveSubtitleSrc(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setActiveSubtitleSrc(null);

    fetch(subtitleRequestUrl(selectedSubtitle), {
      headers: { Authorization: authHeader },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Subtitle request failed (${res.status})`);
        return await res.text();
      })
      .then((vtt) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
        setActiveSubtitleSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setActiveSubtitleSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [authHeader, mediaSource, selectedSubtitle, subtitleRequestUrl]);

  // Toggle text-track visibility when the selected subtitle blob is ready.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.querySelectorAll("track");
    tracks.forEach((track) => {
      track.track.mode = subtitleIndex != null ? "showing" : "disabled";
    });
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = subtitleIndex != null ? "showing" : "disabled";
    }
  }, [activeSubtitleSrc, subtitleIndex]);

  // ---- Custom overlay state ----
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onVol = () => {
      setVolume(v.volume);
      setMuted(v.muted);
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    const onSeeking = () => setBuffering(true);
    const onSeeked = () => setBuffering(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("seeked", onSeeked);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ---------------------------------------------------------------------------
  // Jellyfin session reporting. These three endpoints are what cause the server
  // to remember the playback position, last selected audio track, and last
  // selected subtitle track for this user+item:
  //   POST /Sessions/Playing            — playback started
  //   POST /Sessions/Playing/Progress   — periodic + on state change
  //   POST /Sessions/Playing/Stopped    — playback ended / component unmount
  // The same fields (PositionTicks / AudioStreamIndex / SubtitleStreamIndex)
  // are written to UserItemData and are what we read back on the next load.
  // ---------------------------------------------------------------------------
  const reportingRef = useRef({
    audioIndex: null as number | null,
    subtitleIndex: null as number | null,
    isPaused: true,
    started: false,
  });
  reportingRef.current.audioIndex = audioIndex;
  reportingRef.current.subtitleIndex = subtitleIndex;
  reportingRef.current.isPaused = !isPlaying;

  const sendReport = useCallback(
    (
      path: "Playing" | "Playing/Progress" | "Playing/Stopped",
      extra?: Record<string, unknown>,
    ) => {
      const video = videoRef.current;
      if (!playbackInfo || !mediaSource || !video) return;
      const positionTicks = Math.max(
        0,
        Math.floor(video.currentTime * 10_000_000),
      );
      const body: Record<string, unknown> = {
        ItemId: activeItemId,
        MediaSourceId: mediaSource.Id,
        PlaySessionId: playbackInfo.PlaySessionId,
        PositionTicks: positionTicks,
        AudioStreamIndex: reportingRef.current.audioIndex,
        SubtitleStreamIndex:
          reportingRef.current.subtitleIndex == null
            ? -1
            : reportingRef.current.subtitleIndex,
        IsPaused: reportingRef.current.isPaused,
        IsMuted: video.muted,
        VolumeLevel: Math.round(video.volume * 100),
        PlayMethod: "Transcode",
        CanSeek: true,
        ...extra,
      };
      // Fire-and-forget; failures here must not break playback.
      void fetch(`${baseUrl}/Sessions/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
        keepalive: path === "Playing/Stopped",
      }).catch(() => {});
    },
    [authHeader, baseUrl, activeItemId, mediaSource, playbackInfo],
  );

  // Start reporting once we have playback info + a video element, and tear it
  // down on unmount or when the underlying media changes.
  useEffect(() => {
    if (!enableSessionReporting) return;
    if (!playbackInfo || !mediaSource) return;
    let started = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const video = videoRef.current;
    if (!video) return;

    const ensureStart = () => {
      if (started) return;
      started = true;
      reportingRef.current.started = true;
      sendReport("Playing");
      interval = setInterval(() => sendReport("Playing/Progress"), 10_000);
    };

    const onPlay = () => {
      ensureStart();
      sendReport("Playing/Progress", { EventName: "unpause" });
    };
    const onPause = () =>
      sendReport("Playing/Progress", { EventName: "pause" });
    const onSeeked = () =>
      sendReport("Playing/Progress", { EventName: "timeupdate" });

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);

    if (!video.paused) ensureStart();

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      if (interval) clearInterval(interval);
      if (started) sendReport("Playing/Stopped");
    };
  }, [playbackInfo, mediaSource, sendReport, enableSessionReporting]);

  // Report audio / subtitle changes immediately so the server persists them
  // even if the user navigates away before the next progress tick.
  useEffect(() => {
    if (!reportingRef.current.started) return;
    sendReport("Playing/Progress", { EventName: "audiotrackchange" });
  }, [audioIndex, sendReport]);
  useEffect(() => {
    if (!reportingRef.current.started) return;
    sendReport("Playing/Progress", { EventName: "subtitletrackchange" });
  }, [subtitleIndex, sendReport]);

  // Last-chance save on tab close.
  useEffect(() => {
    const onUnload = () => {
      if (reportingRef.current.started) sendReport("Playing/Stopped");
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, [sendReport]);

  const armHide = useCallback(() => {
    setShowOverlay(true);
    if (!enableAutoHideControls) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowOverlay(false);
    }, 3000);
  }, [enableAutoHideControls]);

  useEffect(() => {
    armHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [armHide, isPlaying]);

  useEffect(() => {
    return () => {
      if (videoTapTimer.current) clearTimeout(videoTapTimer.current);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };
  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(
      0,
      Math.min(v.duration || 0, v.currentTime + delta),
    );
  };
  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };
  const setVol = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    if (val > 0 && v.muted) v.muted = false;
  };
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen().catch(() => {});
  };
  const handleVideoTap = () => {
    if (videoTapTimer.current) {
      clearTimeout(videoTapTimer.current);
      videoTapTimer.current = null;
      toggleFullscreen();
      return;
    }

    videoTapTimer.current = setTimeout(() => {
      videoTapTimer.current = null;
    }, 250);
  };
  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* ignore */
    }
  };
  const playEpisode = (episode: ItemResponse | null) => {
    if (!episode?.Id) return;
    setStartFromBeginningItemId(episode.Id);
    setShowEpisodes(false);
    setActiveItemId(episode.Id);
  };
  const playPreviousEpisode = () => playEpisode(previousEpisode);
  const playNextEpisode = () => playEpisode(nextEpisode);

  const fmtTime = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const s = Math.floor(t % 60);
    const m = Math.floor((t / 60) % 60);
    const h = Math.floor(t / 3600);
    const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const overlayVisible = showOverlay || !isPlaying;

  return (
    <div className={className ?? "w-full h-full overflow-hidden"}>
      <div
        ref={containerRef}
        className="group relative w-full h-full overflow-hidden rounded-lg bg-black select-none"
        onMouseMove={armHide}
        onMouseLeave={() => {
          if (videoRef.current && !videoRef.current.paused)
            setShowOverlay(false);
        }}
        onTouchStart={armHide}
        style={{
          minHeight: "100px",
          maxHeight: "100vh",
          height: "100%",
        }}
      >
        {backdropUrl && loading && (
          <div className="absolute inset-0 z-0">
            <img
              src={backdropUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          crossOrigin="anonymous"
          onClick={handleVideoTap}
          onEnded={playNextEpisode}
          className="relative z-0 w-full h-full bg-black object-contain"
          style={{
            minHeight: "100px",
            maxHeight: "100vh",
            ...subtitleCueStyle,
          }}
        >
          {selectedSubtitle && activeSubtitleSrc && (
            <track
              key={`${selectedSubtitle.Index}-${activeSubtitleSrc}`}
              kind="subtitles"
              srcLang={selectedSubtitle.Language ?? "und"}
              label={streamLabel(selectedSubtitle)}
              src={activeSubtitleSrc}
              default
            />
          )}
        </video>

        {/* Overlay */}
        <div
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-200 ${
            overlayVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Gradient scrim */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

          {/* Top bar */}
          <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-start justify-between px-4 py-3 text-white">
            <div className="flex w-10 items-start justify-start z-10">
              {showBackButton && onBack && (
                <button
                  onClick={onBack}
                  className="rounded-full p-1.5 text-white/90 "
                  aria-label="Back"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
              )}
            </div>
            <div className="flex-1 text-center px-3">
              {enableTitle && displayTitle && (
                <div className="text-lg font-semibold drop-shadow">
                  {displayTitle}
                </div>
              )}
              {enableTitle && displaySubtitle && (
                <div className="text-sm text-white/80 drop-shadow">
                  {displaySubtitle}
                </div>
              )}
            </div>
            <div className="flex w-10 items-start justify-end z-10">
              {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-white/90 "
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>

          {/* Center controls */}
          {enableCenterControls && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-16">
              {enableSkipButtons && (
                <button
                  onClick={() => seekBy(-10)}
                  aria-label="Back 10 seconds"
                  className="pointer-events-auto rounded-full p-3 text-white"
                >
                  <RotateCcw className="h-10 w-10" />
                </button>
              )}
              {!buffering ? (
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="pointer-events-auto rounded-full p-3 text-white"
                >
                  {isPlaying ? (
                    <Pause className="h-12 w-12" fill="white" color="white" />
                  ) : (
                    <Play className="h-12 w-12" fill="white" color="white" />
                  )}
                </button>
              ) : (
                <div className="p-9"></div>
              )}

              {enableSkipButtons && (
                <button
                  onClick={() => seekBy(10)}
                  aria-label="Forward 10 seconds"
                  className="pointer-events-auto rounded-full p-3 text-white "
                >
                  <RotateCw className="h-10 w-10" />
                </button>
              )}
            </div>
          )}

          {/* Buffering indicator */}
          {enableBufferingIndicator && buffering && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-white drop-shadow" />
            </div>
          )}

          {/* Bottom controls */}
          <div
            className="pointer-events-auto absolute inset-x-0 bottom-0 px-3 pb-2 pt-1 text-white"
            style={{
              maxHeight: "35%",
            }}
          >
            {/* Progress */}
            {enableProgressBar && (
              <div className="flex items-center gap-2">
                <span className="w-10 text-[11px] tabular-nums">
                  {fmtTime(currentTime)}
                </span>
                <Slider.Root
                  value={[Math.min(currentTime, duration || 0)]}
                  max={duration || 0}
                  step={0.1}
                  onValueChange={(v) => seekTo(v[0])}
                  className="relative flex h-5 flex-1 touch-none items-center cursor-pointer"
                  aria-label="Seek"
                >
                  <Slider.Track className="relative h-1 w-full grow rounded-full bg-white/25 cursor-pointer">
                    <Slider.Range className="absolute h-full rounded-full bg-white" />
                  </Slider.Track>
                  <Slider.Thumb className="block h-3.5 w-3.5 rounded-full bg-white shadow focus:outline-none cursor-pointer" />
                </Slider.Root>
                <span className="w-12 text-right text-xs tabular-nums">
                  {fmtTime(duration)}
                </span>
              </div>
            )}

            {/* Buttons row */}
            <div className="mt-2 flex items-center gap-1">
              {itemMeta?.Type === "Episode" && (
                <IconBtn
                  onClick={playPreviousEpisode}
                  label="Previous episode"
                  disabled={!previousEpisode}
                >
                  <SkipBack className={BOTTOM_CONTROL_ICON_CLASS} />
                </IconBtn>
              )}
              {enableSkipButtons && (
                <IconBtn onClick={() => seekBy(-10)} label="Back 10 seconds">
                  <RotateCcw className={BOTTOM_CONTROL_ICON_CLASS} />
                </IconBtn>
              )}
              <IconBtn
                onClick={togglePlay}
                label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className={BOTTOM_CONTROL_ICON_CLASS} />
                ) : (
                  <Play className={BOTTOM_CONTROL_ICON_CLASS} />
                )}
              </IconBtn>
              {enableSkipButtons && (
                <IconBtn onClick={() => seekBy(10)} label="Forward 10 seconds">
                  <RotateCw className={BOTTOM_CONTROL_ICON_CLASS} />
                </IconBtn>
              )}
              {itemMeta?.Type === "Episode" && (
                <IconBtn
                  onClick={playNextEpisode}
                  label="Next episode"
                  disabled={!nextEpisode}
                >
                  <SkipForward className={BOTTOM_CONTROL_ICON_CLASS} />
                </IconBtn>
              )}

              {/* Volume */}
              {enableVolumeControl && (
                <div className="ml-2 flex items-center gap-2">
                  <IconBtn
                    onClick={toggleMute}
                    label={muted ? "Unmute" : "Mute"}
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className={BOTTOM_CONTROL_ICON_CLASS} />
                    ) : (
                      <Volume2 className={BOTTOM_CONTROL_ICON_CLASS} />
                    )}
                  </IconBtn>
                  <Slider.Root
                    value={[muted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={(v) => setVol(v[0])}
                    className="relative flex h-5 w-24 touch-none items-center"
                    aria-label="Volume"
                  >
                    <Slider.Track className="relative h-1 w-full grow rounded-full bg-white/25">
                      <Slider.Range className="absolute h-full rounded-full bg-white" />
                    </Slider.Track>
                    <Slider.Thumb className="block h-3 w-3 rounded-full bg-white shadow focus:outline-none" />
                  </Slider.Root>
                </div>
              )}

              {enableXRay &&
                itemMeta &&
                (itemMeta.People?.length || itemMeta.Overview) && (
                  <button
                    id="xray-toggle-btn"
                    onClick={() => setShowXRay((v) => !v)}
                    className={`ml-4 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 text-sm font-medium transition-all duration-200 border border-white/20 shadow-md rounded-md ${
                      showXRay ? "bg-white/10 text-black" : ""
                    }`}
                    style={{
                      fontSize: "0.875rem",
                      minHeight: "32px",
                      outline: "none",
                    }}
                  >
                    X-Ray
                  </button>
                )}

              <div className="ml-auto flex items-center gap-1">
                {/* Combined Audio + Subtitles menu */}
                {(enableAudioTracks || enableSubtitles) &&
                  ((enableAudioTracks && audioStreams.length > 0) ||
                    (enableSubtitles && subtitleStreams.length > 0)) && (
                    <TracksMenu
                      container={containerRef.current}
                      iconClassName={BOTTOM_CONTROL_ICON_CLASS}
                      audioStreams={enableAudioTracks ? audioStreams : []}
                      subtitleStreams={enableSubtitles ? subtitleStreams : []}
                      audioIndex={audioIndex}
                      appliedAudioIndex={appliedAudioIndex}
                      subtitleIndex={subtitleIndex}
                      onSelectAudio={(i) => setAudioIndex(i)}
                      onSelectSubtitle={(i) => setSubtitleIndex(i)}
                      subtitleStyle={subtitleStyle}
                      subtitleSize={subtitleSize}
                      onSelectSubtitleStyle={setSubtitleStyle}
                      onSelectSubtitleSize={setSubtitleSize}
                    />
                  )}

                {enableEpisodes && seriesId && (
                  <IconBtn
                    onClick={() => setShowEpisodes((v) => !v)}
                    label="Episodes"
                  >
                    <ListVideo className={BOTTOM_CONTROL_ICON_CLASS} />
                  </IconBtn>
                )}

                {enablePictureInPicture && (
                  <IconBtn onClick={togglePip} label="Picture in picture">
                    <PictureInPicture2 className={BOTTOM_CONTROL_ICON_CLASS} />
                  </IconBtn>
                )}

                {/* Quality (gear) */}
                {enableQualitySelector && (
                  <QualityMenu
                    container={containerRef.current}
                    iconClassName={BOTTOM_CONTROL_ICON_CLASS}
                    value={bitrate}
                    maxBitrate={maxStreamingBitrate}
                    onSelect={setBitrate}
                  />
                )}

                {enableFullscreen && (
                  <IconBtn
                    onClick={toggleFullscreen}
                    label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize className={BOTTOM_CONTROL_ICON_CLASS} />
                    ) : (
                      <Maximize className={BOTTOM_CONTROL_ICON_CLASS} />
                    )}
                  </IconBtn>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 text-sm text-white">
            Loading…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 px-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {enableEpisodes && seriesId && episodesPanelMounted && (
          <div
            ref={episodesOverlayRef}
            className={`fixed inset-x-0 bottom-0 z-40 w-full max-h-[80vh] rounded-t-xl bg-gradient-to-b from-[#171717]/95 to-transparent border-x border-t border-white/10 p-2 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${
              episodesPanelVisible
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-full opacity-0"
            }`}
          >
            <EpisodesList
              seriesId={seriesId}
              initialSeasonId={itemMeta?.SeasonId ?? undefined}
              playingNowId={activeItemId}
              variant="horizontal"
            />
          </div>
        )}

        {enableXRay && (
          <XRayPanel
            open={showXRay}
            onClose={() => setShowXRay(false)}
            baseUrl={baseUrl}
            accessToken={accessToken}
            item={itemMeta}
          />
        )}
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="rounded-md p-2 text-white  disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function TracksMenu({
  container,
  iconClassName,
  audioStreams,
  subtitleStreams,
  audioIndex,
  appliedAudioIndex,
  subtitleIndex,
  onSelectAudio,
  onSelectSubtitle,
  subtitleStyle,
  subtitleSize,
  onSelectSubtitleStyle,
  onSelectSubtitleSize,
}: {
  container: HTMLElement | null;
  iconClassName: string;
  audioStreams: MediaStream[];
  subtitleStreams: MediaStream[];
  audioIndex: number | null;
  appliedAudioIndex: number | null;
  subtitleIndex: number | null;
  onSelectAudio: (i: number) => void;
  onSelectSubtitle: (i: number | null) => void;
  subtitleStyle: SubtitleStyleOption;
  subtitleSize: SubtitleSizeOption;
  onSelectSubtitleStyle: (value: SubtitleStyleOption) => void;
  onSelectSubtitleSize: (value: SubtitleSizeOption) => void;
}) {
  const [query] = useState("");
  const filteredSubs = subtitleStreams.filter((s) =>
    streamLabel(s).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Audio and subtitles"
          className="rounded-md p-2 text-white "
        >
          <Subtitles className={iconClassName} />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={container ?? undefined}>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-[2147483647] w-full max-w-[560px] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#171717]/95 to-transparent text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="grid grid-cols-1 gap-4 divide-y divide-white/10 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
            {/* Audio */}
            <div className="flex max-h-[42vh] flex-col">
              <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase text-white/60">
                Audio Tracks
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex-1 overflow-auto p-1.5">
                {audioStreams.length === 0 && (
                  <div className="px-3 py-2 text-sm text-white/50">
                    No audio tracks
                  </div>
                )}
                {audioStreams.map((s) => {
                  const active = s.Index === audioIndex;
                  const applied = s.Index === appliedAudioIndex;
                  const pending = active && !applied;
                  return (
                    <button
                      key={s.Index}
                      onClick={() => onSelectAudio(s.Index)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                        active
                          ? "bg-[hsl(0,73%,66%)] font-semibold text-white"
                          : "text-white/90 hover:bg-white/10"
                      }`}
                    >
                      <span className="truncate">{streamLabel(s)}</span>
                      {applied && <Check className="h-3.5 w-3.5 shrink-0" />}
                      {pending && (
                        <span className="shrink-0 text-[10px] uppercase opacity-80">
                          loading…
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Subtitles */}
            <div className="flex max-h-[42vh] flex-col">
              <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase text-white/60">
                Subtitles
              </div>
              <div className="h-px bg-white/10" />
              <div className="px-2 pt-2">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-2 px-1 text-[11px] font-semibold uppercase text-white/60">
                      Style
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {Object.entries(SUBTITLE_STYLE_PRESETS).map(
                        ([key, preset]) => {
                          const option = key as SubtitleStyleOption;
                          const active = option === subtitleStyle;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => onSelectSubtitleStyle(option)}
                              className={`w-full rounded-md border px-2 py-1 text-[11px] transition ${
                                active
                                  ? "border-white bg-white text-black"
                                  : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 "
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 px-1 text-[11px] font-semibold uppercase text-white/60">
                      Size
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {Object.entries(SUBTITLE_SIZE_PRESETS).map(
                        ([key, preset]) => {
                          const option = key as SubtitleSizeOption;
                          const active = option === subtitleSize;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => onSelectSubtitleSize(option)}
                              className={`w-full rounded-md border px-2 py-1 text-[11px] transition ${
                                active
                                  ? "border-white bg-white text-black"
                                  : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 "
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mx-2 my-1.5 h-px bg-white/10" />
              <div className="flex-1 overflow-auto p-1.5">
                <button
                  onClick={() => onSelectSubtitle(null)}
                  className={`block w-full rounded-md px-3 py-1.5 text-left text-sm ${
                    subtitleIndex == null
                      ? "font-semibold text-white"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  Off
                </button>
                {filteredSubs.map((s) => {
                  const active = s.Index === subtitleIndex;
                  return (
                    <button
                      key={s.Index}
                      onClick={() => onSelectSubtitle(s.Index)}
                      className={`block w-full truncate rounded-md px-3 py-1.5 text-left text-sm ${
                        active ? "font-semibold text-white" : "text-white/90 hover:bg-white/10"
                      }`}
                    >
                      {streamLabel(s)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const QUALITY_PRESETS: { label: string; bitrate: number | undefined }[] = [
  { label: "Auto", bitrate: undefined },
  { label: "4K - 120 Mbps", bitrate: 120_000_000 },
  { label: "1080p - 40 Mbps", bitrate: 40_000_000 },
  { label: "1080p - 20 Mbps", bitrate: 20_000_000 },
  { label: "1080p - 10 Mbps", bitrate: 10_000_000 },
  { label: "720p - 8 Mbps", bitrate: 8_000_000 },
  { label: "720p - 4 Mbps", bitrate: 4_000_000 },
  { label: "480p - 2 Mbps", bitrate: 2_000_000 },
  { label: "360p - 1 Mbps", bitrate: 1_000_000 },
  { label: "240p - 420 kbps", bitrate: 420_000 },
];

function QualityMenu({
  container,
  iconClassName,
  value,
  maxBitrate,
  onSelect,
}: {
  container: HTMLElement | null;
  iconClassName: string;
  value: number | undefined;
  maxBitrate: number;
  onSelect: (b: number | undefined) => void;
}) {
  const options = QUALITY_PRESETS.filter((p) => p.bitrate === undefined || p.bitrate <= maxBitrate);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Quality settings"
          className="rounded-md p-2 text-white "
        >
          <Settings className={iconClassName} />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={container ?? undefined}>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-[2147483647] w-52 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#171717]/95 to-transparent text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase text-white/60">
            Video Quality
          </div>
          <div className="h-px bg-white/10" />
          <div className="max-h-[42vh] overflow-auto p-1.5">
            {options.map((p) => {
              const active = p.bitrate === value;
              return (
                <button
                  key={p.bitrate}
                  onClick={() => onSelect(p.bitrate)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    active ? "font-semibold text-white" : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  <span>{p.label}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function XRayPanel({
  open,
  onClose,
  baseUrl,
  accessToken,
  item,
}: {
  open: boolean;
  onClose: () => void;
  baseUrl: string;
  accessToken: string;
  item: ItemResponse | null;
}) {
  const [tab, setTab] = useState<"details" | "cast">("details");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!open || !panelRef.current) return;
      const target = event.target as Element;
      if (panelRef.current.contains(target) || target.closest("#xray-toggle-btn")) {
        return;
      }
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  const people = item?.People ?? [];
  const cast = people.filter(
    (p) => p.Type === "Actor" || p.Type === "GuestStar",
  );
  const crew = people.filter(
    (p) => p.Type !== "Actor" && p.Type !== "GuestStar",
  );

  const personImage = (p: Person) =>
    p.PrimaryImageTag
      ? `${baseUrl}/Items/${p.Id}/Images/Primary?fillHeight=180&fillWidth=180&tag=${p.PrimaryImageTag}&api_key=${accessToken}`
      : null;

  return (
    <div
      ref={panelRef}
      className={`pointer-events-none absolute inset-y-0 left-0 z-40 w-full max-w-md transition-transform duration-300 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="pointer-events-auto flex h-full flex-col bg-gradient-to-b from-[#171717]/95 to-transparent text-white backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold tracking-[0.2em] text-red-500">
              X-RAY
            </span>
            <span className="truncate text-sm font-medium text-white/80">
              {item?.Name ?? ""}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close X-Ray"
            className="rounded-full p-1.5 text-white/80 "
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-white/10 px-3 pt-2 text-sm">
          {(["details", "cast"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-3 pb-2 pt-1 capitalize transition-colors ${
                tab === t ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {t === "cast" ? "Cast & Crew" : "Details"}
              {tab === t && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
          {!item ? (
            <div className="grid h-full place-items-center text-sm text-white/50">
              Loading…
            </div>
          ) : tab === "cast" ? (
            <div className="space-y-5">
              {cast.length === 0 && crew.length === 0 && (
                <div className="text-sm text-white/60">
                  No cast information available.
                </div>
              )}
              {cast.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    In this title
                  </h3>
                  <ul className="divide-y divide-white/5">
                    {cast.map((p) => {
                      const img = personImage(p);
                      return (
                        <li key={p.Id} className="flex items-center gap-3 py-2">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
                            {img ? (
                              <img
                                src={img}
                                alt={p.Name ?? ""}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs text-white/40">
                                {(p.Name ?? "?").slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {p.Name}
                            </div>
                            {p.Role && (
                              <div className="truncate text-xs text-white/60">
                                as {p.Role}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
              {crew.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    Crew
                  </h3>
                  <ul className="divide-y divide-white/5">
                    {crew.map((p) => (
                      <li
                        key={`${p.Id}-${p.Type}`}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium">{p.Name}</span>
                        <span className="shrink-0 text-xs text-white/60">
                          {p.Type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {item.Overview && (
                <section>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    Overview
                  </h3>
                  <p className="leading-relaxed text-white/85">
                    {item.Overview}
                  </p>
                </section>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {item.ProductionYear && (
                  <Meta label="Year" value={String(item.ProductionYear)} />
                )}
                {item.OfficialRating && (
                  <Meta label="Rated" value={item.OfficialRating} />
                )}
                {item.CommunityRating != null && (
                  <Meta
                    label="Rating"
                    value={item.CommunityRating.toFixed(1)}
                  />
                )}
                {item.RunTimeTicks && (
                  <Meta
                    label="Runtime"
                    value={`${Math.max(1, Math.round(item.RunTimeTicks / 600_000_000))}m`}
                  />
                )}
              </div>
              {item.Genres && item.Genres.length > 0 && (
                <section>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    Genres
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {item.Genres.map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {item.Studios && item.Studios.length > 0 && (
                <section>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    Studios
                  </h3>
                  <div className="text-xs text-white/80">
                    {item.Studios.map((s) => s.Name)
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

export default JellyfinPlayer;
