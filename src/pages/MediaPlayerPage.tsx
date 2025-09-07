import clsx from "clsx";
import Hls from "hls.js";
import {
  ArrowLeft,
  ChevronsLeft,
  ChevronsRight,
  GalleryVerticalEnd,
  Maximize,
  Minimize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  PictureInPicture2, // Add PiP icon
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import NextEpisodeButton from "../components/ui/nextEpisodeButton";
import SubtitleTrack from "../components/ui/SubtitleTrack";
import TracksMenu from "../components/ui/TracksMenu";
import { useAuth } from "../context/AuthContext";
import { useMediaItem } from "../hooks/useMediaData";
import isDrawerOpen from "../states/atoms/DrawerOpen";
import { MediaItem, MediaStream } from "../types/jellyfin";
import SkipIntroButton from "../components/ui/skipIntroButton";
import EpisodesList from "../components/ui/EpisodesList";
import RewindIcon from "../assets/svg/rewind-10-seconds.svg";
import ForwardIcon from "../assets/svg/forward-10-seconds.svg";

interface VideoElementWithHls extends HTMLVideoElement {
  __hlsInstance?: Hls | null;
}

// Helper to detect iOS Safari
function isIOSSafari() {
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) &&
    !("MSStream" in window) &&
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
  );
}
const isIOS = isIOSSafari();

const MediaPlayerPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { item, isLoading } = useMediaItem(itemId);
  const { api } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { callbackPath } = location.state ?? {};

  const setIsDrawerOpen = useSetRecoilState(isDrawerOpen);

  const videoRef = useRef<VideoElementWithHls>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  // Add a state for controls hide delay (ms)
  const [controlsHideDelay, setControlsHideDelay] = useState(3000);
  const [subtitleTracks, setSubtitleTracks] = useState<MediaStream[]>([]);
  const [tracksMenuOpen, setTracksMenuOpen] = useState(false);
  const [localSubtitleUrl, setLocalSubtitleUrl] = useState<string | null>(null);
  const [localSubtitleName, setLocalSubtitleName] = useState<string | null>(
    null
  );
  const [localSubtitleFile, setLocalSubtitleFile] = useState<File | null>(null); // new state
  const [subtitleDelayMs, setSubtitleDelayMs] = useState(0);

  // --- Add state for episodes menu visibility ---
  const [showEpisodesMenu, setShowEpisodesMenu] = useState(false);
  const episodesMenuRef = useRef<HTMLDivElement | null>(null);
  const episodesButtonRef = useRef<HTMLButtonElement | null>(null); // <-- add ref for the button

  const [showOrientationOverlay, setShowOrientationOverlay] = useState(false);

  // Detect orientation for mobile devices
  useEffect(() => {
    function checkOrientation() {
      // Only enforce for iPhone/iPad
      if (!isIOS) {
        setShowOrientationOverlay(false);
        return;
      }
      // Use window.orientation or matchMedia
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      setShowOrientationOverlay(!landscape);
    }
    checkOrientation();
    window.addEventListener("orientationchange", checkOrientation);
    window.addEventListener("resize", checkOrientation);
    return () => {
      window.removeEventListener("orientationchange", checkOrientation);
      window.removeEventListener("resize", checkOrientation);
    };
  }, []);

  // Move togglePlay definition above safeTogglePlay
  const togglePlay = React.useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  // Prevent play if not landscape on mobile
  const safeTogglePlay = React.useCallback(() => {
    if (showOrientationOverlay) return;
    togglePlay();
  }, [showOrientationOverlay, togglePlay]);

  useEffect(() => {
    if (!showEpisodesMenu) return;
    function handleClickOutside(event: MouseEvent) {
      // If click is inside the menu, ignore
      if (episodesMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      // If click is on the button, ignore
      if (episodesButtonRef.current?.contains(event.target as Node)) {
        return;
      }
      setShowEpisodesMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEpisodesMenu]);

  // Audio tracks state
  const [audioTracks, setAudioTracks] = useState<
    { id: number; label: string; language: string }[]
  >([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);
  type SubtitleIndex = number | string | null; // Can be number (server track), 'local', or null (off)
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] =
    useState<SubtitleIndex>(null);
  const [hasInitializedSelections, setHasInitializedSelections] =
    useState(false);

  // Add loader state for audio switching
  const [isSwitchingAudio, setIsSwitchingAudio] = useState(false);

  // Track if we have already restored position for this session
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);

  // Next episode state
  const [nextEpisode, setNextEpisode] = useState<MediaItem | null>(null);
  // Previous episode state
  const [previousEpisode, setPreviousEpisode] = useState<MediaItem | null>(
    null
  );
  // Flag to force starting video from the beginning, e.g., for next/prev episode
  const [forceStartFromBeginning, setForceStartFromBeginning] = useState(false);

  // --- Intro skip state ---
  const [intro, setIntro] = useState<{ start: number; end: number } | null>(
    null
  );
  const [hasSkippedIntro, setHasSkippedIntro] = useState(false);

  // Helper: returns true if chapter name is an intro-like segment
  const isIntroChapter = React.useCallback(
    (name: string | undefined): boolean => {
      const n = (name ?? "").toLowerCase();
      return (
        n.includes("studio logo") ||
        n.includes("disclaimer") ||
        n.includes("intro") ||
        n.includes("opening") ||
        n.includes("opening credits") ||
        n.includes("title sequence")
      );
    },
    []
  );

  // Improved: returns true if chapter is a "real" scene (not intro-like)
  const isNonIntroChapter = React.useCallback(
    (name: string | undefined): boolean => !isIntroChapter(name),
    [isIntroChapter]
  );

  // Detect intro marker when item changes
  useEffect(() => {
    setHasSkippedIntro(false);
    if (item?.Chapters && Array.isArray(item.Chapters)) {
      // Find all intro-like chapters
      const chaptersWithIdx = item.Chapters.map((ch, idx) => ({
        ...ch,
        idx,
      }));

      // Find all intro chapters
      const introChapters = chaptersWithIdx.filter((ch) =>
        isIntroChapter(ch.Name)
      );
      if (introChapters.length > 0) {
        const firstIntro = introChapters[0];
        const lastIntro = introChapters[introChapters.length - 1];
        const start = Math.floor(
          (firstIntro.StartPositionTicks ?? 0) / 10000000
        );

        // Find the first non-intro chapter that occurs after the *first* intro chapter
        let end: number | undefined;
        for (let i = firstIntro.idx + 1; i < item.Chapters.length; ++i) {
          const ch = item.Chapters[i];
          if (
            isNonIntroChapter(ch.Name) &&
            typeof ch.StartPositionTicks === "number"
          ) {
            end = Math.ceil(ch.StartPositionTicks / 10000000);
            break;
          }
        }
        // If not found, fallback to after the last intro
        if (!end) {
          for (let i = lastIntro.idx + 1; i < item.Chapters.length; ++i) {
            const ch = item.Chapters[i];
            if (
              isNonIntroChapter(ch.Name) &&
              typeof ch.StartPositionTicks === "number"
            ) {
              end = Math.ceil(ch.StartPositionTicks / 10000000);
              break;
            }
          }
        }
        // If still not found, fallback to runtime or default
        if (!end) {
          if (typeof item.RunTimeTicks === "number") {
            end = Math.ceil(item.RunTimeTicks / 10000000);
          } else {
            end = start + 85;
          }
        }
        setIntro({ start, end });
        return;
      }
    }
    setIntro(null);
  }, [item, isNonIntroChapter, isIntroChapter]);

  // Reset hasSkippedIntro if user seeks back before intro.start
  useEffect(() => {
    if (intro && hasSkippedIntro && currentTime < intro.start) {
      setHasSkippedIntro(false);
    }
  }, [currentTime, intro, hasSkippedIntro]);

  // Hide skip intro button after intro ends or after skipping
  useEffect(() => {
    if (!intro) return;
    if (currentTime > intro.end && !hasSkippedIntro) setHasSkippedIntro(true);
  }, [currentTime, intro, hasSkippedIntro]);

  // Helper functions for cookies
  function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/`;
  }
  function getCookie(name: string): string | null {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(name + "="))
        ?.split("=")[1] ?? null
    );
  }

  // Reset player position states when the item itself changes
  useEffect(() => {
    setHasRestoredPosition(false);
    setCurrentTime(0);
    setDuration(0);
    // Do NOT reset forceStartFromBeginning here, as it's set by user action right before item change.
    // It will be consumed and reset by the main playback useEffect.
  }, [itemId]);

  // Get playback URL and restore position
  useEffect(() => {
    let hls: Hls | null = null;
    if (!api || !item) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Get last watched position from API (UserData)
    // This 'resumeTime' is the potential start time from UserData if not forced or already restored.
    let resumeTimeFromUserData = 0;
    if (item.UserData?.PlaybackPositionTicks) {
      resumeTimeFromUserData = Math.floor(
        item.UserData.PlaybackPositionTicks / 10000000
      );
    }

    let timeToStartVideoAt;

    if (!hasRestoredPosition) {
      // This is an initial load for the current 'item'
      if (forceStartFromBeginning) {
        timeToStartVideoAt = 0; // Force start from beginning
      } else {
        timeToStartVideoAt = resumeTimeFromUserData; // Use UserData or 0 if no UserData
      }
    } else {
      // Position has been restored before for this item; likely an audio/subtitle track change.
      // Resume from the video's actual current playback time.
      timeToStartVideoAt = videoRef.current?.currentTime || currentTime || 0;
    }

    // This is the crucial time that will be passed to videoEl.currentTime in restoreTimeAndPlay
    const prevTime = timeToStartVideoAt;

    // If forceStartFromBeginning was true, reset it now that it has been used for this load.
    if (forceStartFromBeginning) {
      setForceStartFromBeginning(false);
    }

    const wasPlaying = isPlaying || !videoEl.paused;

    // Show loader when switching audio
    setIsSwitchingAudio(true);

    // Clean up previous HLS instance if any
    if (videoEl.__hlsInstance) {
      videoEl.__hlsInstance.destroy();
      videoEl.__hlsInstance = null;
    }

    // Remove all event listeners for loadedmetadata
    videoEl.onloadedmetadata = null;

    // Helper to restore time and play state
    const restoreTimeAndPlay = () => {
      // Wait for metadata to be loaded
      // If prevTime is 0, we still want to set it if currentTime is not already 0.
      // The original (prevTime > 0) prevented setting to 0.
      if (videoEl && Math.abs(videoEl.currentTime - prevTime) > 0.5) {
        try {
          videoEl.currentTime = prevTime;
        } catch (err) {
          console.log(err);
        }
      }
      setHasRestoredPosition(true);
      if (wasPlaying) {
        setTimeout(() => {
          videoEl.play();
          setIsSwitchingAudio(false);
        }, 0);
      } else {
        setIsSwitchingAudio(false);
      }
    };

    const playbackUrl = api.getPlaybackUrl(item.Id, selectedAudioTrack);

    // --- Report "playing" to Jellyfin when a new video is loaded ---
    const playSessionId = `${api["deviceId"]}-${Date.now()}`;
    api.reportPlaying?.({
      itemId: item.Id,
      mediaSourceId: item.Id,
      playSessionId,
      audioStreamIndex: selectedAudioTrack,
      subtitleStreamIndex:
        typeof selectedSubtitleIndex === "number" ? selectedSubtitleIndex : 0,
      positionTicks: Math.floor((prevTime || 0) * 10000000), // Changed resumeTime to prevTime
      volumeLevel: 100,
      isMuted: false,
      isPaused: false,
      repeatMode: "RepeatNone",
      shuffleMode: "Sorted",
      maxStreamingBitrate: 140000000,
      playbackStartTimeTicks: Date.now() * 10000,
      playbackRate: 1,
      secondarySubtitleStreamIndex: -1,
      bufferedRanges: [],
      playMethod: "DirectPlay",
      nowPlayingQueue: [{ Id: item.Id, PlaylistItemId: "playlistItem0" }],
      canSeek: true,
    });
    // -------------------------------------------------------------

    // Attach event listeners for progress, etc.
    const handleTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const handleDurationChange = () => setDuration(videoEl.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("durationchange", handleDurationChange);
    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);

    if (Hls.isSupported()) {
      hls = new Hls();
      videoEl.__hlsInstance = hls;
      hls.loadSource(playbackUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        restoreTimeAndPlay();
      });
      hls.on(Hls.Events.ERROR, () => {
        setIsSwitchingAudio(false);
      });
    } else {
      videoEl.src = playbackUrl;
      videoEl.addEventListener("loadedmetadata", restoreTimeAndPlay, {
        once: true,
      });
      videoEl.addEventListener("error", () => setIsSwitchingAudio(false), {
        once: true,
      });
    }

    getSubtitles();

    return () => {
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("durationchange", handleDurationChange);
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("loadedmetadata", restoreTimeAndPlay);
      videoEl.removeEventListener("error", () => setIsSwitchingAudio(false));
      if (videoEl.__hlsInstance) {
        videoEl.__hlsInstance.destroy();
        videoEl.__hlsInstance = null;
      }
      if (hls) {
        hls.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, item, selectedAudioTrack, forceStartFromBeginning]); // Added forceStartFromBeginning

  // Report playback progress to Jellyfin
  useEffect(() => {
    if (!api || !item) return;
    if (!isPlaying) return;

    let lastReported = -1;
    let rafId: number;

    const report = () => {
      if (!videoRef.current) return;
      const pos = Math.floor(videoRef.current.currentTime);
      // Only report if at least 2s since last report or at end
      if (
        pos !== lastReported &&
        (pos % 2 === 0 || pos === Math.floor(duration))
      ) {
        lastReported = pos;
        // Report progress to Jellyfin API
        api.reportPlaybackProgress?.(
          item.Id,
          pos,
          selectedAudioTrack,
          typeof selectedSubtitleIndex === "number" ? selectedSubtitleIndex : 0
        );
      }
      rafId = requestAnimationFrame(report);
    };

    rafId = requestAnimationFrame(report);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    api,
    item,
    isPlaying,
    duration,
    selectedAudioTrack,
    selectedSubtitleIndex,
  ]);

  // Auto-hide controls
  useEffect(() => {
    const hideControls = () => {
      if (isPlaying && !tracksMenuOpen && !showEpisodesMenu) {
        setShowControls(false);
      }
    };

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (showControls) {
      controlsTimeoutRef.current = setTimeout(hideControls, controlsHideDelay);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [
    showControls,
    isPlaying,
    tracksMenuOpen,
    showEpisodesMenu,
    controlsHideDelay,
  ]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const getSubtitles = async () => {
    if (!api || !item) return;
    try {
      const subtitles = await api.fetchSubtitleTracks(item);
      if (subtitles) {
        setSubtitleTracks(subtitles);
      }
    } catch (error) {
      console.error("Error fetching subtitles:", error);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;

    setIsMuted(!isMuted);
    videoRef.current.muted = !isMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;

    if (newVolume === 0) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;

    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  };

  const toggleFullscreen = React.useCallback(() => {
    if (!playerContainerRef.current) return;

    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      playerContainerRef.current.requestFullscreen();
    }
  }, [isFullscreen]);

  const toggleEpsisodesMenu = () => {
    setShowEpisodesMenu((prev) => !prev);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const skip = React.useCallback((seconds: number) => {
    if (!videoRef.current) return;

    const newTime = videoRef.current.currentTime + seconds;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(newTime, videoRef.current.duration)
    );
    // Show controls and increase hide delay to 5s when skipping
    setShowControls(true);
    setControlsHideDelay(5000);
    // Reset delay back to default after 5s so next auto-hide uses default
    setTimeout(() => setControlsHideDelay(3000), 5000);
  }, []);

  const handlePlayerClick = () => {
    setShowControls(true);
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();

      // Prevent triggering controls when user is typing in an input or textarea
      if (tag === "input" || tag === "textarea") return;

      switch (e.code) {
        case "Space":
          e.preventDefault(); // Prevent scrolling
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10); // You already have this `skip` function
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, skip, toggleFullscreen]);

  // Extract audio tracks from item and restore last selected audio/subtitle from cookie (only once per item)
  useEffect(() => {
    if (!item) {
      setAudioTracks([]);
      setSelectedAudioTrack(0);
      setSelectedSubtitleIndex(null);
      setHasInitializedSelections(false);
      return;
    }
    const tracks =
      item.MediaStreams?.filter((s) => s.Type === "Audio")?.map((s, idx) => ({
        id: s.Index,
        label: s.DisplayTitle ?? `Track ${idx + 1}`,
        language: s.Language ?? "",
      })) || [];
    setAudioTracks(tracks);

    // Only initialize from cookie the first time for this item
    if (!hasInitializedSelections) {
      const cookie = getCookie(`jellyfin_media_${item.Id}`);
      let audioId = tracks[0]?.id ?? 0;
      let subtitleIdx: number | string | null = null; // Can be number, 'local', or null
      if (cookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie));
          if (
            typeof parsed.audio === "number" &&
            tracks.some((t) => t.id === parsed.audio)
          ) {
            audioId = parsed.audio;
          }
          // We don't persist "local" subtitle selection via cookie for simplicity.
          // User will need to re-upload if they refresh.
          if (parsed.subtitle === null || typeof parsed.subtitle === "number") {
            subtitleIdx = parsed.subtitle;
          }
        } catch (err) {
          console.log(err);
        }
      }
      setSelectedAudioTrack(audioId);
      setSelectedSubtitleIndex(subtitleIdx);
      setHasInitializedSelections(true);
    }
  }, [item, hasInitializedSelections]);

  // Store selected audio track and subtitle index in a single cookie as JSON
  useEffect(() => {
    if (!item || !hasInitializedSelections) return;
    setCookie(
      `jellyfin_media_${item.Id}`,
      JSON.stringify({
        audio: selectedAudioTrack,
        // Don't persist "local" in cookie, store null instead.
        subtitle:
          typeof selectedSubtitleIndex === "string"
            ? null
            : selectedSubtitleIndex,
      }),
      7
    );
  }, [
    item,
    selectedAudioTrack,
    selectedSubtitleIndex,
    hasInitializedSelections,
  ]);

  const handleSelectLocalSubtitle = (file: File) => {
    if (localSubtitleUrl) {
      URL.revokeObjectURL(localSubtitleUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setLocalSubtitleUrl(newUrl);
    setLocalSubtitleName(file.name);
    setLocalSubtitleFile(file); // store file
    handleSetSelectedSubtitleTrackUI("local");
  };

  const handleUploadLocalSubtitle = async (file: File) => {
    if (!api || !item) return;
    try {
      await api.uploadSubtitleToServer(item.Id, file, "eng", false, false);
      getSubtitles();
      alert("Subtitle uploaded successfully!");
    } catch {
      alert("Failed to upload subtitle");
    }
  };

  const handleSetSelectedSubtitleTrackUI = (index: SubtitleIndex) => {
    // If a new local subtitle is being activated, this function is called with "local".
    // If a server track or "Off" is selected, we just update the index.
    // The localSubtitleUrl and localSubtitleName should persist so the option remains in the menu.
    // They are only cleared/updated when a *new* local file is uploaded via handleSelectLocalSubtitle.
    setSelectedSubtitleIndex(index);
  };
  const increaseSubtitleDelay = () => {
    setSubtitleDelayMs((prev) => prev + 100);
  };

  const decreaseSubtitleDelay = () => {
    setSubtitleDelayMs((prev) => prev - 100);
  };

  const resetSubtitleDelay = () => {
    setSubtitleDelayMs(0);
  };

  const [subtitleFontSize, setSubtitleFontSize] = useState<number>(28);

  const increaseSubtitleFontSize = () =>
    setSubtitleFontSize((prev) => Math.min(prev + 2, 72));
  const decreaseSubtitleFontSize = () =>
    setSubtitleFontSize((prev) => Math.max(prev - 2, 12));
  const resetSubtitleFontSize = () => setSubtitleFontSize(28);

  const handleBack = () => {
    if (!item) return;
    let targetId = item.Id;
    if (
      item.Type === "Episode" &&
      item.SeriesId &&
      typeof item.SeriesId === "string"
    ) {
      targetId = item.SeriesId;
    }
    setIsDrawerOpen(false); // Close the drawer if open
    const basePath = callbackPath ?? "/home";

    navigate(`${basePath}?item=${targetId}`);
  };

  // Fetch next and previous episode if this is an episode
  useEffect(() => {
    if (!api || !item) return;
    if (item.Type !== "Episode" || !item.SeriesId) {
      setNextEpisode(null);
      setPreviousEpisode(null);
      return;
    }
    // Find next and previous episode using IndexNumber
    api.getEpisodes(item.SeriesId, item.SeasonId).then((episodes) => {
      if (!episodes || !item.IndexNumber) {
        setNextEpisode(null);
        setPreviousEpisode(null);
        return;
      }
      const currentIndex = episodes.findIndex((ep) => ep.Id === item.Id);
      if (currentIndex !== -1) {
        if (currentIndex + 1 < episodes.length) {
          setNextEpisode(episodes[currentIndex + 1]);
        } else {
          setNextEpisode(null);
        }
        if (currentIndex - 1 >= 0) {
          setPreviousEpisode(episodes[currentIndex - 1]);
        } else {
          setPreviousEpisode(null);
        }
      } else {
        setNextEpisode(null);
        setPreviousEpisode(null);
      }
    });
  }, [api, item]);

  const playNextEpisode = () => {
    if (nextEpisode) {
      setForceStartFromBeginning(true); // Signal to start next episode from beginning
      const firstSegment = location.pathname.split("/")[1];
      navigate(`/play/${nextEpisode.Id}`, {
        state: { callbackPath: `/${firstSegment}` },
      });
      // No need to reset other states here, useEffect[item.Id] handles it.
    }
  };

  const playPreviousEpisode = () => {
    if (previousEpisode) {
      setForceStartFromBeginning(true); // Signal to start previous episode from beginning
      const firstSegment = location.pathname.split("/")[1];
      navigate(`/play/${previousEpisode.Id}`, {
        state: { callbackPath: `/${firstSegment}` },
      });
      // No need to reset other states here, useEffect[item.Id] handles it.
    }
  };

  // Hide skip intro button after intro ends or after skipping
  useEffect(() => {
    if (!intro) return;
    if (currentTime > intro.end) setHasSkippedIntro(true);
  }, [currentTime, intro]);

  useEffect(() => {
    if (nextEpisode && duration > 0 && duration - currentTime < 30) {
      setShowControls(true);
    }
  }, [nextEpisode, duration, currentTime]);

  // Handler for skip intro
  const handleSkipIntro = () => {
    if (!videoRef.current || !intro) return;
    videoRef.current.currentTime = intro.end;
    setHasSkippedIntro(true);
  };

  // Set Media Session metadata for iOS/iPadOS control center
  useEffect(() => {
    if (!item || !api) return;
    if (!("mediaSession" in navigator)) return;

    // Get the best thumbnail url (prefer Primary, fallback to Backdrop)
    let artworkUrl = "";
    if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {
      artworkUrl = api.getImageUrl(item.Id, "Thumb", 512, 288);
    } else if (item.ImageTags?.Primary) {
      artworkUrl = api.getImageUrl(item.Id, "Primary", 512, 512);
    }

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: item.Name,
      // artist: item.Artists?.join(", ") || item.AlbumArtist || "",
      artist: item.SeriesName ?? "Jellyfin",
      // album: `Jellyfin - ${item.SeriesName}`,
      artwork: artworkUrl
        ? [
            { src: artworkUrl, sizes: "512x512", type: "image/jpeg" },
            // Optionally add more sizes/types if available
          ]
        : [],
    });

    // Optionally, handle play/pause/seek actions
    navigator.mediaSession.setActionHandler?.("play", () => {
      videoRef.current?.play();
    });
    navigator.mediaSession.setActionHandler?.("pause", () => {
      videoRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler?.("seekto", (details: any) => {
      if (
        videoRef.current &&
        details.fastSeek &&
        "fastSeek" in videoRef.current
      ) {
        videoRef.current.fastSeek(details.seekTime);
      } else if (videoRef.current) {
        videoRef.current.currentTime = details.seekTime;
      }
    });

    // Clean up on unmount
    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [item, api]);

  // Add state to track if video is loaded
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Get the best backdrop image URL
  let backdropUrl: string | null = null;
  if (item?.BackdropImageTags && item.BackdropImageTags.length > 0 && api) {
    backdropUrl = api.getImageUrl(item.Id, "Backdrop", 1920, 1080);
  } else if (item?.ImageTags?.Primary && api) {
    backdropUrl = api.getImageUrl(item.Id, "Primary", 600, 900);
  }

  // PiP state
  const [isPiP, setIsPiP] = useState(false);

  // PiP toggle handler
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!document.pictureInPictureEnabled || video.disablePictureInPicture)
      return;
    try {
      if (!isPiP) {
        await video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (e) {
      console.error("Error toggling Picture-in-Picture:", e);
    }
  };

  // Listen for PiP events to update state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function onEnterPiP() {
      setIsPiP(true);
    }
    function onLeavePiP() {
      setIsPiP(false);
    }
    video.addEventListener("enterpictureinpicture", onEnterPiP);
    video.addEventListener("leavepictureinpicture", onLeavePiP);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnterPiP);
      video.removeEventListener("leavepictureinpicture", onLeavePiP);
    };
  }, []);

  // --- Native subtitle track injection for PiP ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove all previous dynamic tracks
    Array.from(video.querySelectorAll("track[data-dynamic='true']")).forEach(
      (t) => t.remove()
    );

    // Only add if a subtitle is selected and PiP is active
    if (
      isPiP &&
      (localSubtitleUrl || typeof selectedSubtitleIndex === "number") &&
      selectedSubtitleIndex !== null
    ) {
      let trackUrl: string | undefined;
      let label = "Subtitle";
      const kind = "subtitles";
      const srclang = "en";

      if (selectedSubtitleIndex === "local" && localSubtitleUrl) {
        // Only inject if the file is .vtt (WebVTT)
        if (localSubtitleName?.toLowerCase().endsWith(".vtt")) {
          trackUrl = localSubtitleUrl;
          label = localSubtitleName || "Local Subtitle";
        }
      }

      if (trackUrl) {
        const trackElem = document.createElement("track");
        trackElem.setAttribute("data-dynamic", "true");
        trackElem.kind = kind;
        trackElem.label = label;
        trackElem.srclang = srclang;
        trackElem.src = trackUrl;
        trackElem.default = true;
        video.appendChild(trackElem);
      }
    }
  }, [
    isPiP,
    localSubtitleUrl,
    localSubtitleName,
    selectedSubtitleIndex,
    subtitleTracks,
    api,
    item,
  ]);

  if (isLoading || !item || !api) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div
      ref={playerContainerRef}
      className={clsx(
        // Use fixed positioning and 100vw/100vh to prevent scrollbars on iPad/square screens
        "fixed inset-0 w-screen h-screen bg-black text-white overflow-hidden",
        { "cursor-none": !showControls && isPlaying }
      )}
      onClick={handlePlayerClick}
      onMouseMove={handleMouseMove}
      // Add responsive font size for controls
      style={{
        fontSize: "clamp(14px, 2vw, 18px)",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      {/* Orientation overlay for mobile portrait */}
      {showOrientationOverlay && (
        <div>
          {/* Back button in top left */}
          <button
            onClick={handleBack}
            className="absolute top-16 left-4 flex items-center gap-2 text-white bg-red-600 hover:bg-red-700 rounded-full px-5 py-2 font-semibold transition-colors z-[200]"
            style={{ fontSize: "1rem" }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90">
            <div className="text-white text-center px-8 py-6 rounded-lg bg-black/80 shadow-lg relative">
              <div className="mb-4">
                <svg width="48" height="48" fill="none" viewBox="0 0 48 48">
                  <rect
                    x="10"
                    y="14"
                    width="28"
                    height="20"
                    rx="4"
                    fill="#ef4444"
                  />
                  <path
                    d="M24 6v6M24 42v-6M6 24h6M42 24h-6"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="text-lg font-semibold mb-2">
                Rotate your device
              </div>
              <div className="text-base">
                For the best experience, please rotate your device to landscape
                mode.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop image as background while video loads */}
      {!videoLoaded && backdropUrl && !isPiP && (
        <img
          src={backdropUrl}
          alt="Backdrop"
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none transition-opacity duration-500"
          draggable={false}
        />
      )}

      {/* Loader overlay when switching audio */}
      {isSwitchingAudio && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
        </div>
      )}

      {/* Video + SubtitleTrack wrapper */}
      <div className="w-full h-full relative">
        <video
          ref={videoRef}
          className="w-full h-full relative object-contain transition-opacity duration-500"
          autoPlay
          // onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          onLoadedMetadata={() => setVideoLoaded(true)}
          style={{
            maxWidth: "100vw",
            maxHeight: "100vh",
            backgroundColor: "#000",
            borderRadius: "0.5rem",
            outline: "none",
            opacity: videoLoaded ? 1 : 0, // <-- fade in video when loaded
          }}
          controlsList="nodownload"
          // playsInline
        >
          <track kind="captions" /> {/* Placeholder for captions if needed */}
        </video>
        {/* SubtitleTrack overlay for non-PiP mode only */}
        {!isPiP && (localSubtitleUrl || selectedSubtitleIndex !== null) && (
          <SubtitleTrack
            subtitleTracks={subtitleTracks}
            selectedSubtitleIndex={selectedSubtitleIndex}
            itemId={item.Id}
            currentTime={currentTime}
            localSubtitleFileUrl={
              selectedSubtitleIndex === "local"
                ? localSubtitleUrl ?? undefined
                : undefined
            }
            subtitleDelayMs={subtitleDelayMs}
            fontSize={subtitleFontSize}
          />
        )}
      </div>
      {/* Skip Intro Button */}
      {intro &&
        !hasSkippedIntro &&
        currentTime >= intro.start &&
        currentTime < intro.end && (
          <div className="absolute bottom-[6rem] right-8 z-50 pointer-events-none">
            <div className="pointer-events-auto">
              <SkipIntroButton
                onClick={handleSkipIntro}
                width={150}
                height={50}
              />
            </div>
          </div>
        )}

      {/* Next Episode Button Overlay */}
      {nextEpisode && duration > 0 && duration - currentTime < 30 && (
        <div className="absolute bottom-[6rem] right-8 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <NextEpisodeButton
              nextEpisode={nextEpisode}
              playNextEpisode={() => playNextEpisode()}
            />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        role="button"
        tabIndex={0}
        className={clsx(
          "absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 transition-opacity duration-300 select-none cursor-default",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onDoubleClick={toggleFullscreen}
        onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to the video
        style={{
          // Make controls more visible on mobile
          padding:
            "env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)",
        }}
      >
        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 p-4 flex items-center z-20"
          style={{
            gap: "1rem",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
            minHeight: "56px",
          }}
        >
          <button
            onClick={() => handleBack()}
            className="flex items-center gap-2 text-white bg-black/60 rounded-full p-3 hover:bg-black/80 transition-colors"
            style={{
              minWidth: "44px",
              minHeight: "44px",
              fontSize: "1.2rem",
              outline: "none",
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <h1
            className="text-xl font-medium text-white ml-3 truncate"
            style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              maxWidth: "70vw",
            }}
          >
            {item.Name}
          </h1>
        </div>

        {/* Center controls - mobile layout */}
        {videoLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div
              className="flex flex-row items-center justify-center gap-10 sm:gap-20 pointer-events-auto"
              style={{
                marginBottom: "2rem",
              }}
            >
              <button
                onClick={() => skip(-10)}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white/30 hover:bg-white/40 rounded-full p-5 transition-colors shadow-lg"
                style={{
                  touchAction: "manipulation",
                  minWidth: "56px",
                  minHeight: "56px",
                  outline: "none",
                  backdropFilter: "blur(5px) saturate(1.5)",
                }}
                tabIndex={0}
                disabled={showOrientationOverlay}
              >
                <img
                  src={RewindIcon}
                  alt="Rewind 10 seconds"
                  className="w-8 h-8"
                />
              </button>
              <button
                onClick={safeTogglePlay}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white/30 hover:bg-white/40 rounded-full p-7 mx-2 transition-colors shadow-lg"
                style={{
                  touchAction: "manipulation",
                  minWidth: "72px",
                  minHeight: "72px",
                  outline: "none",
                  backdropFilter: "blur(5px) saturate(1.5)",
                }}
                tabIndex={0}
                disabled={showOrientationOverlay}
              >
                {isPlaying ? (
                  <Pause size={40} strokeWidth="1.5" />
                ) : (
                  <Play size={40} strokeWidth="1.5" />
                )}
              </button>
              <button
                onClick={() => skip(10)}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white/30 hover:bg-white/40 rounded-full p-5 transition-colors shadow-lg"
                style={{
                  touchAction: "manipulation",
                  minWidth: "56px",
                  minHeight: "56px",
                  outline: "none",
                  backdropFilter: "blur(5px) saturate(1.5)",
                }}
                tabIndex={0}
                disabled={showOrientationOverlay}
              >
                <img
                  src={ForwardIcon}
                  alt="Forward 10 seconds"
                  className="w-8 h-8"
                />
              </button>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 space-y-2 z-20"
          style={{
            // background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            minHeight: "80px",
            // Increase fallback padding for iPhone landscape
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)",
            boxSizing: "border-box",
          }}
        >
          {/* Progress bar */}
          <div
            className="flex items-center gap-2"
            style={{
              minHeight: "32px",
            }}
          >
            {videoLoaded ? (
              <>
                <span
                  className="text-sm w-12 text-white font-mono"
                  style={{ fontSize: "1rem", textShadow: "0 1px 4px #000" }}
                >
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="video-progress w-full h-2 bg-white/40 rounded-full appearance-none cursor-pointer"
                  style={{
                    accentColor: "#ef4444",
                    height: "2.5px",
                    borderRadius: "2px",
                  }}
                />
                <span
                  className="text-sm text-white font-mono"
                  style={{ fontSize: "1rem", textShadow: "0 1px 4px #000" }}
                >
                  {formatTime(duration)}
                </span>
              </>
            ) : (
              <div className="w-full h-[3px] bg-white/20 rounded-full overflow-hidden relative">
                <div
                  className="absolute left-0 top-0 h-full bg-white/30 animate-indeterminate"
                  style={{ width: "40%" }}
                ></div>
                <style>
                  {`
                  @keyframes indeterminate {
                    0% {
                      left: -40%;
                      width: 40%;
                    }
                    60% {
                      left: 100%;
                      width: 60%;
                    }
                    100% {
                      left: 100%;
                      width: 60%;
                    }
                  }
                  .animate-indeterminate {
                    animation: indeterminate 1.2s infinite cubic-bezier(0.4,0,0.2,1);
                  }
                  `}
                </style>
              </div>
            )}
          </div>

          {/* Controls row */}
          <div
            className="flex items-center justify-between flex-wrap gap-2"
            style={{
              minHeight: "48px",
              flexWrap: "wrap",
            }}
          >
            <div
              className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start"
              style={{ flexWrap: "wrap" }}
            >
              {previousEpisode && (
                <button
                  onClick={playPreviousEpisode}
                  className="text-white hover:text-gray-300 transition-colors"
                  title="Previous Episode"
                >
                  <SkipBack size={22} />
                </button>
              )}
              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-gray-300 transition-colors"
                style={{
                  minWidth: "44px",
                  minHeight: "44px",
                  fontSize: "1.1rem",
                  outline: "none",
                }}
              >
                <ChevronsLeft size={28} />
              </button>
              <button
                onClick={togglePlay}
                className="text-white hover:text-gray-300 transition-colors"
                style={{
                  minWidth: "44px",
                  minHeight: "44px",
                  fontSize: "1.1rem",
                  outline: "none",
                }}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button
                onClick={() => skip(10)}
                className="text-white hover:text-gray-300 transition-colors"
                style={{
                  minWidth: "44px",
                  minHeight: "44px",
                  fontSize: "1.1rem",
                  outline: "none",
                }}
              >
                <ChevronsRight size={28} />
              </button>
              {nextEpisode && (
                <button
                  onClick={playNextEpisode}
                  className="text-white hover:text-gray-300 transition-colors"
                  title="Next Episode"
                >
                  <SkipForward size={22} />
                </button>
              )}
              <div
                className="flex items-center gap-2"
                style={{ minWidth: "120px" }}
              >
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300 transition-colors"
                  style={{
                    minWidth: "44px",
                    minHeight: "44px",
                    outline: "none",
                  }}
                >
                  {(() => {
                    let volumeIcon;
                    if (isMuted) {
                      volumeIcon = <VolumeX size={28} />;
                    } else if (volume > 0.5) {
                      volumeIcon = <Volume2 size={28} />;
                    } else {
                      volumeIcon = <Volume1 size={28} />;
                    }
                    return volumeIcon;
                  })()}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider w-24 h-2 bg-white/40 rounded-full appearance-none cursor-pointer"
                  style={{
                    accentColor: "#ef4444",
                    height: "2.5px",
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>
            <div
              className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end"
              style={{ flexWrap: "wrap" }}
            >
              {item.Type !== "Movie" && (
                <button
                  ref={episodesButtonRef}
                  className="text-white hover:text-gray-300 transition-colors mr-2"
                  onClick={toggleEpsisodesMenu}
                  onDoubleClick={(e) => e.stopPropagation()} // Prevent double click from bubbling up
                  style={{
                    minWidth: "44px",
                    minHeight: "44px",
                    outline: "none",
                  }}
                >
                  <GalleryVerticalEnd size={28} />
                </button>
              )}

              <TracksMenu
                audioTracks={audioTracks}
                selectedAudioTrack={selectedAudioTrack}
                setSelectedAudioTrack={setSelectedAudioTrack}
                subtitleTracks={subtitleTracks}
                selectedSubtitleIndex={selectedSubtitleIndex}
                setSelectedSubtitleIndex={handleSetSelectedSubtitleTrackUI}
                onSelectLocalSubtitle={handleSelectLocalSubtitle}
                onUploadLocalSubtitle={handleUploadLocalSubtitle} // new prop
                localSubtitleName={localSubtitleName}
                localSubtitleFile={localSubtitleFile} // new prop
                subtitleDelayMs={subtitleDelayMs}
                increaseSubtitleDelay={increaseSubtitleDelay}
                decreaseSubtitleDelay={decreaseSubtitleDelay}
                resetSubtitleDelay={resetSubtitleDelay}
                isOpen={tracksMenuOpen}
                setIsOpen={setTracksMenuOpen}
                // Pass font size props
                subtitleFontSize={subtitleFontSize}
                increaseSubtitleFontSize={increaseSubtitleFontSize}
                decreaseSubtitleFontSize={decreaseSubtitleFontSize}
                resetSubtitleFontSize={resetSubtitleFontSize}
              />
              {/* PiP Button */}
              <button
                onClick={togglePiP}
                className={clsx(
                  "text-white hover:text-gray-300 transition-colors",
                  isPiP && "opacity-70"
                )}
                title="Picture in Picture"
                disabled={
                  !document.pictureInPictureEnabled ||
                  videoRef.current?.disablePictureInPicture
                }
                style={{
                  minWidth: "44px",
                  minHeight: "44px",
                  outline: "none",
                }}
              >
                <PictureInPicture2 size={28} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 transition-colors"
                style={{
                  minWidth: "44px",
                  minHeight: "44px",
                  outline: "none",
                }}
              >
                {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
              </button>
            </div>
          </div>

          {/* Episodes List button and overlay */}
          {item.Type === "Episode" && item.SeriesId && item.SeasonId && (
            <div className="mt-6">
              {showEpisodesMenu && (
                <div
                  ref={episodesMenuRef}
                  className="absolute right-0 bottom-[90px] w-[620px] max-h-[80vh] bg-neutral-900 text-white text-sm rounded-xl overflow-y-auto shadow-lg p-2 z-50 pl-6"
                >
                  <EpisodesList
                    seriesId={item.SeriesId}
                    initialSeasonId={item.SeasonId}
                    playingNowId={item.Id}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaPlayerPage;
