import clsx from "clsx";
import Hls from "hls.js";
import {
  ArrowLeft,
  ChevronsLeft,
  ChevronsRight,
  Maximize,
  Minimize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SubtitleTrack from "../components/ui/SubtitleTrack";
import TracksMenu from "../components/ui/TracksMenu";
import { useAuth } from "../context/AuthContext";
import { useMediaItem } from "../hooks/useMediaData";
import { MediaStream } from "../types/jellyfin";

interface VideoElementWithHls extends HTMLVideoElement {
  __hlsInstance?: Hls | null;
}

const MediaPlayerPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { item, isLoading } = useMediaItem(itemId);
  const { api } = useAuth();
  const navigate = useNavigate();

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
  const [subtitleTracks, setSubtitleTracks] = useState<MediaStream[]>([]);
  const [tracksMenuOpen, setTracksMenuOpen] = useState(false);

  // Audio tracks state
  const [audioTracks, setAudioTracks] = useState<
    { id: number; label: string; language: string }[]
  >([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<
    number | null
  >(null);
  const [hasInitializedSelections, setHasInitializedSelections] =
    useState(false);

  // Add loader state for audio switching
  const [isSwitchingAudio, setIsSwitchingAudio] = useState(false);

  // Track if we have already restored position for this session
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);

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

  // Get playback URL and restore position
  useEffect(() => {
    let hls: Hls | null = null;
    if (!api || !item) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Get last watched position from API (UserData)
    let resumeTime = 0;
    if (!hasRestoredPosition) {
      if (item.UserData?.PlaybackPositionTicks) {
        resumeTime = Math.floor(item.UserData.PlaybackPositionTicks / 10000000);
      }
    }

    // Save current time and play state before switching audio track
    const prevTime =
      !hasRestoredPosition && resumeTime > 0
        ? resumeTime
        : currentTime || videoEl.currentTime || 0;
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
      if (prevTime > 0 && Math.abs(videoEl.currentTime - prevTime) > 0.5) {
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
      subtitleStreamIndex: selectedSubtitleIndex ?? 0,
      positionTicks: Math.floor((resumeTime || 0) * 10000000),
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
  }, [api, item, selectedAudioTrack]);

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
          selectedSubtitleIndex ?? 0
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
      if (isPlaying && !tracksMenuOpen) {
        setShowControls(false);
      }
    };

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (showControls) {
      controlsTimeoutRef.current = setTimeout(hideControls, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, tracksMenuOpen]);

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

  const togglePlay = React.useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const skip = React.useCallback((seconds: number) => {
    if (!videoRef.current) return;

    const newTime = videoRef.current.currentTime + seconds;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(newTime, videoRef.current.duration)
    );
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
      let subtitleIdx: number | null = null;
      if (cookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie));
          if (
            typeof parsed.audio === "number" &&
            tracks.some((t) => t.id === parsed.audio)
          ) {
            audioId = parsed.audio;
          }
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
        subtitle: selectedSubtitleIndex,
      }),
      7
    );
  }, [
    item,
    selectedAudioTrack,
    selectedSubtitleIndex,
    hasInitializedSelections,
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
      className="relative w-full h-screen bg-black text-white overflow-hidden"
      onClick={handlePlayerClick}
      onMouseMove={handleMouseMove}
    >
      {/* Loader overlay when switching audio */}
      {isSwitchingAudio && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full"
        autoPlay
        onClick={togglePlay}
      >
        <track
          kind="subtitles"
          srcLang="en"
          label="English"
          src="/subtitles/english.vtt"
          default
        />
      </video>

      {/* SubtitleTrack now handles fetching and displaying the active subtitle */}
      {selectedSubtitleIndex !== null && (
        <SubtitleTrack
          subtitleTracks={subtitleTracks}
          selectedSubtitleIndex={selectedSubtitleIndex}
          itemId={item.Id}
          currentTime={currentTime}
        />
      )}

      {/* Controls overlay */}
      <div
        role="button"
        tabIndex={0}
        className={clsx(
          "absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 transition-opacity duration-300 select-none cursor-default",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onDoubleClick={toggleFullscreen}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center z-20">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-medium text-white ml-3 truncate">
            {item.Name}
          </h1>
        </div>

        {/* Center controls - mobile layout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="flex flex-row items-center justify-center gap-8 sm:gap-10 pointer-events-auto">
            <button
              onClick={() => skip(-10)}
              className="bg-white/20 hover:bg-white/30 rounded-full p-4 transition-colors"
              style={{ touchAction: "manipulation" }}
              tabIndex={0}
            >
              <ChevronsLeft size={28} />
            </button>
            <button
              onClick={togglePlay}
              className="bg-white/20 hover:bg-white/30 rounded-full p-6 mx-2 transition-colors"
              style={{ touchAction: "manipulation" }}
              tabIndex={0}
            >
              {isPlaying ? <Pause size={36} /> : <Play size={36} />}
            </button>
            <button
              onClick={() => skip(10)}
              className="bg-white/20 hover:bg-white/30 rounded-full p-4 transition-colors"
              style={{ touchAction: "manipulation" }}
              tabIndex={0}
            >
              <ChevronsRight size={28} />
            </button>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 z-20">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <span className="text-sm">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              className="video-progress w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer"
              style={{
                ...(duration
                  ? ({
                      "--progress": `${(currentTime / duration) * 100}%`,
                    } as React.CSSProperties)
                  : {}),
              }}
            />
            <span className="text-sm">{formatTime(duration)}</span>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
              <button
                onClick={togglePlay}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <SkipBack size={24} />
              </button>
              <button
                onClick={() => skip(10)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <SkipForward size={24} />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  {(() => {
                    let volumeIcon;
                    if (isMuted) {
                      volumeIcon = <VolumeX size={24} />;
                    } else if (volume > 0.5) {
                      volumeIcon = <Volume2 size={24} />;
                    } else {
                      volumeIcon = <Volume1 size={24} />;
                    }
                    return volumeIcon;
                  })()}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer"
                  style={{
                    ...(typeof volume === "number"
                      ? ({
                          "--volume-progress": `${volume * 100}%`,
                        } as React.CSSProperties)
                      : {}),
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <TracksMenu
                audioTracks={audioTracks}
                selectedAudioTrack={selectedAudioTrack}
                setSelectedAudioTrack={setSelectedAudioTrack}
                subtitleTracks={subtitleTracks}
                selectedSubtitleIndex={selectedSubtitleIndex}
                setSelectedSubtitleIndex={setSelectedSubtitleIndex}
                isOpen={tracksMenuOpen}
                setIsOpen={setTracksMenuOpen}
              />
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayerPage;
