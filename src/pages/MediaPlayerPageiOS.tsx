// JellyfinPlayer.tsx
import Hls from "hls.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { MediaSourceResponse } from "../types/jellyfin";

type StreamType = "Video" | "Audio" | "Subtitle";

interface JellyfinStream {
  Id?: string;
  Index?: number | null;
  Language?: string | null;
  DisplayTitle?: string | null;
  Type: StreamType;
  IsDefault?: boolean;
  DeliveryUrl?: string | null; // may or may not be present in playbackInfo
  IsExternal?: boolean;
  // other fields omitted for brevity
}

/**
 * Props:
 * - serverUrl: base url of jellyfin server, e.g. "http://192.168.0.10:8096"
 * - apiKey: Jellyfin API key (X-Emby-Token style)
 * - itemId: Jellyfin Item ID to fetch playback info for
 * - userId: optional user id for PlaybackInfo call
 */
interface VideoElementWithHls extends HTMLVideoElement {
  __hlsInstance?: Hls | null;
}

export function MediaPlayerPageiOS() {
  const { api } = useAuth();
  const { itemId } = useParams<{ itemId: string }>();
  const videoRef = useRef<VideoElementWithHls | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<MediaSourceResponse>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // current chosen indices for audio/subtitle (null -> let server decide / include all)
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | null>(
    null
  );
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<
    number | null | -1
  >(null); // -1 -> none

  // fetch PlaybackInfo
  useEffect(() => {
    if (!api || !itemId) return;
    setLoading(true);
    setError(null);

    const fetchPlaybackInfo = async () => {
      const options = {
        EnableDirectPlay: true,
        EnableDirectStream: true,
        EnableTranscoding: true,
      };
      try {
        const playbackInfo = await api.getPlaybackInfo(itemId, options);
        setPlaybackInfo(playbackInfo);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching playback info:", error);
        setLoading(false);
      }
    };

    fetchPlaybackInfo();
  }, [itemId, api]);

  // choose first mediaSource as default (you can extend to let user pick)
  const mediaSource = useMemo(
    () => playbackInfo?.MediaSources?.[0] ?? null,
    [playbackInfo]
  );

  // Collect tracks from mediaSource
  const audioStreams = useMemo(
    () => (mediaSource?.MediaStreams ?? []).filter((s) => s.Type === "Audio"),
    [mediaSource]
  );
  const subtitleStreams = useMemo(
    () =>
      (mediaSource?.MediaStreams ?? []).filter((s) => s.Type === "Subtitle"),
    [mediaSource]
  );

  // Create a mock API object similar to MediaPlayerPage.tsx
  const mockApi = useMemo(
    () => ({
      getPlaybackUrl: (itemId: string, audioStreamIndex?: number) => {
        if (!api || !itemId) return "";
        if (!mediaSource) return "";

        // For iOS native player, we want to include all audio tracks in the HLS stream
        // Don't specify specific AudioStreamIndex to let iOS native player handle track selection
        // const params = new URLSearchParams();
        // params.set("DeviceId", "web-player");
        // params.set("MediaSourceId", mediaSource.Id);
        // params.set("Static", "false"); // Important: disable static to get proper HLS streaming
        // params.set("VideoCodec", "h264");
        // params.set("AudioCodec", "aac");
        // params.set("VideoStreamIndex", "0");
        // params.set("SegmentContainer", "ts");
        // params.set("MinSegments", "1");
        // params.set("BreakOnNonKeyFrames", "true");
        // params.set("api_key", apiKey);

        // // Force transcoding to ensure multi-audio support
        // params.set("RequireAvc", "false");
        // params.set("RequireNonAnamorphic", "false");

        // The key: DON'T set AudioStreamIndex when we want all tracks
        // Jellyfin should include all available audio tracks in the HLS manifest

        // Try master.m3u8 which is specifically for multi-track HLS
        const finalUrl = api.getPlaybackUrl(itemId, audioStreamIndex);
        return finalUrl;
      },
    }),
    [mediaSource, api]
  );

  // helper to build a video stream URL that asks Jellyfin for specific audio/subtitle indexes.
  const buildVideoUrl = useMemo(
    () =>
      ({
        audioIndex,
      }: {
        audioIndex?: number | null;
        subtitleIndex?: number | null;
      }) => {
        if (!mediaSource) return "";

        // Use the mock API's getPlaybackUrl method like MediaPlayerPage
        if (!api || !itemId) return "";
        return api.getPlaybackUrl(itemId, audioIndex ?? undefined);
      },
    [api, itemId, mediaSource]
  );

  // derived video url based on selection
  const videoUrl = useMemo(
    () =>
      buildVideoUrl({
        audioIndex: selectedAudioIndex ?? null,
        subtitleIndex:
          selectedSubtitleIndex === -1 ? null : selectedSubtitleIndex ?? null,
      }),
    [buildVideoUrl, selectedAudioIndex, selectedSubtitleIndex]
  );

  // When audio selected & browser supports audioTracks, enable the right one.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // on some browsers, audioTracks is available once metadata is loaded
    const trySetAudioTrack = () => {
      // @ts-expect-error - audioTracks may not be available on all browsers
      const audioTracks = v.audioTracks;
      if (!audioTracks) {
        console.log("Audio tracks not available on this browser");
        return;
      }

      console.log(`Found ${audioTracks.length} audio tracks`);

      // For iOS, log available tracks but don't force selection - let native player handle it
      if (isIOS) {
        for (let i = 0; i < audioTracks.length; i++) {
          console.log(
            `Audio track ${i}: ${
              audioTracks[i].label || audioTracks[i].language || "Unknown"
            }`
          );
        }
        return;
      }

      // For non-iOS browsers, enable the selected track
      for (let i = 0; i < audioTracks.length; i++) {
        audioTracks[i].enabled = i === (selectedAudioIndex ?? -1);
      }
    };

    // If audioTracks exist now, apply immediately
    trySetAudioTrack();

    // Also apply on loadedmetadata (some browsers populate audioTracks later)
    const onLoaded = () => {
      console.log("Video metadata loaded, checking for audio tracks...");
      trySetAudioTrack();
    };

    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [selectedAudioIndex, videoUrl]);

  // If videoUrl changes we reload the video with HLS support
  useEffect(() => {
    let hls: Hls | null = null;
    const v = videoRef.current;
    if (!v || !videoUrl) return;

    // preserve time and playing state
    const wasPlaying = !v.paused && !v.ended;
    const currentTime = v.currentTime || 0;

    // Clean up previous HLS instance if any
    if (v.__hlsInstance) {
      v.__hlsInstance.destroy();
      v.__hlsInstance = null;
    }

    // Remove all event listeners for loadedmetadata
    v.onloadedmetadata = null;

    // Helper to restore time and play state
    const restoreTimeAndPlay = () => {
      // Restore time if available
      try {
        if (currentTime > 0 && v.duration > currentTime) {
          v.currentTime = Math.min(currentTime, v.duration - 0.5);
        }
      } catch (err) {
        console.log("Error restoring time:", err);
      }
      if (wasPlaying) {
        v.play().catch((err) => console.log("Error playing:", err));
      }
    };

    // Add subtitle track error handling with fallback URLs and audio track detection
    const handleSubtitleError = () => {
      const tracks = v.querySelectorAll("track");
      tracks.forEach((track, index) => {
        const subtitleStream = subtitleStreams[index];
        if (!subtitleStream || typeof subtitleStream.Index !== "number") return;

        // Create fallback URLs
        const fallbackUrls = [
          `${serverUrl}/Videos/${itemId}/Subtitles/${
            subtitleStream.Index
          }/Stream.vtt?api_key=${encodeURIComponent(
            apiKey
          )}&mediaSourceId=${encodeURIComponent(mediaSource?.Id || "")}`,
          `${serverUrl}/Videos/${itemId}/Subtitles/${
            subtitleStream.Index
          }/Stream.vtt?api_key=${encodeURIComponent(apiKey)}`,
          `${serverUrl}/Videos/${itemId}/${mediaSource?.Id}/Subtitles/${
            subtitleStream.Index
          }/Stream.vtt?api_key=${encodeURIComponent(apiKey)}`,
        ];

        let fallbackIndex = 0;

        const tryNextUrl = () => {
          if (fallbackIndex < fallbackUrls.length) {
            const nextUrl = fallbackUrls[fallbackIndex];
            console.log(
              `Trying fallback URL ${fallbackIndex + 1} for subtitle ${
                subtitleStream.Index
              }: ${nextUrl}`
            );
            track.src = nextUrl;
            fallbackIndex++;
          } else {
            console.error(
              `All subtitle URL attempts failed for track ${index}`
            );
          }
        };

        track.addEventListener("error", (e) => {
          console.error(`Subtitle track ${index} failed to load:`, e);
          console.error(`Track src: ${track.src}`);
          tryNextUrl();
        });

        track.addEventListener("load", () => {
          console.log(
            `Subtitle track ${index} loaded successfully: ${track.src}`
          );
        });
      });
    };

    // Enhanced audio track detection and logging
    const detectAudioTracks = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      console.log(`🔍 Debug info:`);
      console.log(`  Video URL: ${videoUrl}`);
      console.log(
        `  Available audio streams from PlaybackInfo: ${audioStreams.length}`
      );
      audioStreams.forEach((stream, idx) => {
        console.log(
          `    Stream ${idx}: ${
            stream.DisplayTitle || stream.Language || "Unknown"
          } (Index: ${stream.Index})`
        );
      });

      // @ts-expect-error - audioTracks may not be available on all browsers
      const audioTracks = v.audioTracks;
      if (audioTracks && audioTracks.length > 0) {
        console.log(
          `✅ Found ${audioTracks.length} audio tracks in video element:`
        );
        for (let i = 0; i < audioTracks.length; i++) {
          const track = audioTracks[i];
          console.log(`  Audio track ${i}:`, {
            label: track.label || "Unknown",
            language: track.language || "Unknown",
            kind: track.kind || "Unknown",
            enabled: track.enabled,
            id: track.id || "Unknown",
          });
        }

        if (isIOS) {
          console.log(
            "🍎 iOS detected - audio tracks should be available in native player controls"
          );
          console.log(
            "💡 Look for audio/language button in video controls (usually bottom-right or tap video)"
          );
        }
      } else {
        console.log("❌ No audio tracks detected in video element");
        console.log(
          "🚨 This means Jellyfin is not including multiple audio tracks in the HLS manifest"
        );
        if (isIOS) {
          console.log(
            "🍎 iOS - HLS manifest should include multiple audio tracks for native selection"
          );
          console.log(
            "💡 Try checking the HLS manifest directly by opening the video URL in a new tab"
          );
        }
      }

      // Log textTracks as well (for subtitles)
      if (v.textTracks && v.textTracks.length > 0) {
        console.log(`📝 Found ${v.textTracks.length} text tracks (subtitles):`);
        for (let i = 0; i < v.textTracks.length; i++) {
          const track = v.textTracks[i];
          console.log(`  Text track ${i}:`, {
            label: track.label || "Unknown",
            language: track.language || "Unknown",
            kind: track.kind || "Unknown",
            mode: track.mode,
          });
        }
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls();
      v.__hlsInstance = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest parsed");
        restoreTimeAndPlay();
        handleSubtitleError();
        detectAudioTracks();
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", event, data);
      });
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      v.src = videoUrl;
      v.addEventListener(
        "loadedmetadata",
        () => {
          restoreTimeAndPlay();
          handleSubtitleError();
          detectAudioTracks();
        },
        { once: true }
      );
    } else {
      // Fallback to direct stream
      v.src = videoUrl;
      v.addEventListener(
        "loadedmetadata",
        () => {
          restoreTimeAndPlay();
          handleSubtitleError();
          detectAudioTracks();
        },
        { once: true }
      );
    }

    return () => {
      v.removeEventListener("loadedmetadata", restoreTimeAndPlay);
      if (v.__hlsInstance) {
        v.__hlsInstance.destroy();
        v.__hlsInstance = null;
      }
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoUrl, itemId, mediaSource?.Id, subtitleStreams, audioStreams]);

  if (loading) return <div>Loading playback info…</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!mediaSource) return <div>No media source found in PlaybackInfo.</div>;

  // Helper to build subtitle <track> src: if a stream has DeliveryUrl use it, otherwise we build an endpoint
  const getSubtitleTrackUrl = (s: JellyfinStream) => {
    console.log(`Building subtitle URL for stream:`, s);

    // Only try to build subtitle URLs for external subtitles or if we have a valid Index
    if (typeof s.Index === "number") {
      // For external subtitles, they often have IsExternal = true and should use DeliveryUrl
      if (s.IsExternal && !s.DeliveryUrl) {
        console.log(`External subtitle without DeliveryUrl, skipping:`, s);
        return "";
      }

      // Try the most reliable Jellyfin subtitle endpoints in order
      const endpoints = [
        // Most common working endpoint
        `${serverUrl}/Videos/${itemId}/${mediaSource?.Id}/Subtitles/${
          s.Index
        }/0/Stream.vtt?api_key=${encodeURIComponent(apiKey)}`,
        // Alternative format
        `${serverUrl}/Videos/${itemId}/Subtitles/${
          s.Index
        }/Stream.vtt?api_key=${encodeURIComponent(
          apiKey
        )}&mediaSourceId=${encodeURIComponent(mediaSource?.Id || "")}`,
        // Simple format
        `${serverUrl}/Videos/${itemId}/Subtitles/${
          s.Index
        }/Stream.vtt?api_key=${encodeURIComponent(apiKey)}`,
      ];

      // Use the first endpoint - this is the most commonly working format
      const primaryUrl = endpoints[0];
      console.log(`Using subtitle stream endpoint: ${primaryUrl}`);
      return primaryUrl;
    }

    console.log(`No valid subtitle URL could be generated for stream:`, s);
    return "";
  };

  if (!api || !itemId) return <div>Invalid state: missing API or item ID</div>;

  return (
    <div>
      {/* Custom subtitle styling - Enhanced for iOS */}
      <style>{`
        /* Standard WebVTT cue styling */
        video::cue {
          background: transparent !important;
          background-color: transparent !important;
          color: white !important;
          font-size: 16px !important;
          font-family: Arial, sans-serif !important;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
          line-height: 1.3 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* WebKit subtitle display (Safari/iOS) */
        video::-webkit-media-text-track-display {
          background: transparent !important;¬
          background-color: transparent !important;
          font-size: 16px !important;
          padding: 0 !important;
          margin: 0 !important;
          bottom: 10px !important;
        }
        
        /* WebKit subtitle container */
        video::-webkit-media-text-track-container {
          position: relative !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* iOS specific subtitle styling */
        video::-webkit-media-text-track-region {
          background: transparent !important;
          background-color: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Force remove any background on cue rendering */
        video::cue(.subtitles) {
          background: transparent !important;
          background-color: transparent !important;
        }
        
        /* Target iOS native subtitle background specifically */
        video::-webkit-media-controls-panel,
        video::-webkit-media-text-track-display-backdrop {
          background: transparent !important;
          background-color: transparent !important;
        }
        
        /* Remove bottom padding and background more aggressively */
        video::-webkit-media-text-track-display {
          transform: translateY(-20px) !important;
          background: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        
        /* Target the actual subtitle backdrop element */
        video::-webkit-media-text-track-display-backdrop,
        video::-webkit-media-text-track-region-container,
        video::-webkit-media-text-track-background {
          background: transparent !important;
          background-color: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        
        /* iOS WebKit cue background removal */
        video::cue-region {
          background: transparent !important;
        }
        
        /* More specific iOS subtitle background removal */
        video[controls]::-webkit-media-text-track-display {
          background: transparent !important;
          background-color: transparent !important;
        }
        
        /* Force transparent for all possible subtitle background selectors */
        video *[class*="subtitle"],
        video *[class*="caption"],
        video *[class*="text-track"] {
          background: transparent !important;
          background-color: transparent !important;
        }
        
        /* iOS Safari specific overrides - target the actual rendered subtitle elements */
        video::-webkit-media-text-track-display * {
          background: transparent !important;
          background-color: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Target iOS video subtitle rendering more specifically */
        @supports (-webkit-appearance: none) {
          video::cue {
            background: transparent !important;
            background-color: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border-radius: 0 !important;
          }
          
          video::-webkit-media-text-track-display {
            background: transparent !important;
            background-color: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            bottom: 5px !important;
          }
        }
      `}</style>
      <video
        ref={videoRef}
        controls
        playsInline
        style={
          {
            width: "100%",
            borderRadius: 8,
            background: "#000",
            // Custom subtitle styles
            "--webkit-text-track-color": "white",
            "--webkit-text-track-background": "transparent",
            "--webkit-text-track-font-size": "16px",
            "--webkit-text-track-font-family": "Arial, sans-serif",
            "--webkit-text-track-text-shadow": "1px 1px 2px black",
          } as React.CSSProperties
        }
        crossOrigin="anonymous" // Required for subtitle tracks to work properly
      >
        {/* Primary source – server will respond based on audio/subtitle query params we set on the URL */}
        <source src={videoUrl} type="application/x-mpegURL" />
        {/* Add all subtitle tracks for iOS native player - not just those with DeliveryUrl */}
        {subtitleStreams
          .filter((s) => api.getVTTStream(itemId, s.Index)) // Only include tracks with valid URLs
          .map((s, idx) => {
            const trackUrl = api.getVTTStream(itemId, s.Index);
            return (
              <track
                style={{ backgroundColor: "transparent !important" }}
                key={itemId}
                kind="subtitles"
                src={trackUrl}
                srcLang={s.Language ?? "und"}
                label={
                  s.DisplayTitle ?? s.Language ?? `Subtitle ${s.Index ?? idx}`
                }
                default={s.IsDefault && idx === 0} // Only set first default track as default
              />
            );
          })}
        Your browser does not support HTML5 video.
      </video>
    </div>
  );
}
