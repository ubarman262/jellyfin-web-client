/* eslint-disable react-hooks/exhaustive-deps */
import DOMPurify from "dompurify";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { MediaStream } from "../../types/jellyfin";

// Props: subtitleTracks, selectedSubtitleIndex, itemId, api, currentTime
type SubtitleTrackProps = {
  subtitleTracks: MediaStream[]; // For server-side tracks
  selectedSubtitleIndex: number | string | null; // For server-side tracks, or 'local'
  itemId: string; // For server-side tracks
  currentTime: number;
  localSubtitleFileUrl?: string; // URL for the local subtitle file (object URL)
  subtitleDelayMs: number;
  fontSize?: number; // <-- Add this prop for font size
  videoEl?: HTMLVideoElement | null; // access native textTracks
};

const SubtitleTrack = ({
  subtitleTracks,
  selectedSubtitleIndex,
  itemId,
  currentTime,
  localSubtitleFileUrl,
  subtitleDelayMs,
  fontSize = 36, // <-- Default font size
  videoEl,
}: SubtitleTrackProps) => {
  interface SubtitleEvent {
    StartPositionTicks: number;
    EndPositionTicks?: number;
    Text: string;
    [key: string]: unknown;
  }
  const [subtitleData, setSubtitleData] = useState<SubtitleEvent[] | null>(
    null
  );
  const { api } = useAuth();
  const [nativeCueText, setNativeCueText] = useState<string | null>(null);
  const [usingNativeCues, setUsingNativeCues] = useState(false);

  // Prefer native textTracks cues for server-side subtitles to avoid drift.
  useEffect(() => {
    setUsingNativeCues(false);
    setNativeCueText(null);

    // Only when a server subtitle index is selected and a video element exists.
    if (!videoEl || typeof selectedSubtitleIndex !== "number") return;

    const trackElements = Array.from(videoEl.querySelectorAll("track"));
    const textTracks = videoEl.textTracks;
    if (!textTracks || textTracks.length === 0) return;

    // Find the DOM <track> with matching data-jf-index, then map to textTracks by index.
    const domIndex = trackElements.findIndex((t) => {
      const attr = t.getAttribute("data-jf-index");
      return attr !== null && Number(attr) === selectedSubtitleIndex;
    });
    if (domIndex < 0 || !textTracks[domIndex]) return;
    const tt = textTracks[domIndex];

    // Hide visual rendering but keep cues accessible.
    try {
      tt.mode = "hidden";
    } catch {}

    const getEffectiveCueText = () => {
      // Apply delay by sampling cues at effective time.
      const effectiveTime = (videoEl.currentTime ?? 0) + subtitleDelayMs / 1000;
      // Prefer activeCues; if delay is non-zero, search cues list manually.
      if (Math.abs(subtitleDelayMs) < 1) {
        const ac = tt.activeCues as unknown as TextTrackCueList | null;
        const cue = ac && ac.length > 0 ? (ac[0] as VTTCue | TextTrackCue) : null;
        return cue ? (cue as any).text ?? null : null;
      }
      const cues = tt.cues as unknown as TextTrackCueList | null;
      if (!cues || cues.length === 0) return null;
      for (let i = 0; i < cues.length; i++) {
        const c = cues[i] as VTTCue | TextTrackCue;
        const start = (c as any).startTime ?? 0;
        const end = (c as any).endTime ?? start + 5;
        if (effectiveTime >= start && effectiveTime < end) {
          return (c as any).text ?? null;
        }
      }
      return null;
    };

    const updateFromTrack = () => {
      const txt = getEffectiveCueText();
      setNativeCueText(txt);
      setUsingNativeCues(true);
    };

    const onCueChange = () => updateFromTrack();
    const onTimeUpdate = () => updateFromTrack();

    tt.addEventListener?.("cuechange", onCueChange as any);
    videoEl.addEventListener("timeupdate", onTimeUpdate);
    updateFromTrack();

    return () => {
      tt.removeEventListener?.("cuechange", onCueChange as any);
      videoEl.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoEl, selectedSubtitleIndex, subtitleDelayMs]);

  // Helper to parse HH:MM:SS,mmm into ticks
  const timeToTicks = (timeStr: string): number => {
    const parts = timeStr.split(/[:,]/);
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    const ms = parseInt(parts[3], 10);
    return (h * 3600 + m * 60 + s) * 10000000 + ms * 10000;
  };

  // Basic SRT parser
  const parseSrt = (srtContent: string): SubtitleEvent[] => {
    const events: SubtitleEvent[] = [];
    const blocks = srtContent.trim().split(/\r?\n\r?\n/);
    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      if (lines.length < 3) continue; // Need at least index, time, text

      const timeLine = lines[1];
      const textLines = lines.slice(2).join("\n");

      const timeParts = timeLine.split(" --> ");
      if (timeParts.length !== 2) continue;

      try {
        const StartPositionTicks = timeToTicks(timeParts[0]);
        const EndPositionTicks = timeToTicks(timeParts[1]);
        events.push({
          StartPositionTicks,
          EndPositionTicks,
          Text: textLines,
        });
      } catch (e) {
        console.error("Error parsing time in SRT block:", timeLine, e);
      }
    }
    return events;
  };


  useEffect(() => {
    const fetchAndSetSubtitle = async () => {
      // If using native cues, skip custom fetch/parsing.
      if (usingNativeCues) {
        setSubtitleData(null);
        return;
      }
      if (localSubtitleFileUrl) {
        try {
          const response = await fetch(localSubtitleFileUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch local subtitle: ${response.statusText}`);
          }
          const srtContent = await response.text();
          const parsedEvents = parseSrt(srtContent);
          setSubtitleData(parsedEvents);
        } catch (error) {
          console.error("Error loading or parsing local subtitle:", error);
          setSubtitleData(null);
        }
      } else if (api && itemId && typeof selectedSubtitleIndex === 'number' && subtitleTracks?.length) {
        const subtitle = subtitleTracks.find(
          (track) => track.Index === selectedSubtitleIndex
        );
        if (!subtitle) {
          setSubtitleData(null);
          return;
        }
        try {
          const trackEvents = await api.fetchSelectedSubtitle(
            itemId,
            subtitle.Index
          );
          setSubtitleData(trackEvents ?? null);
        } catch {
          setSubtitleData(null);
        }
      } else {
        setSubtitleData(null); // Clear if no valid source
      }
    };
    fetchAndSetSubtitle();
  }, [api, itemId, selectedSubtitleIndex, subtitleTracks, localSubtitleFileUrl, usingNativeCues]);

  const currentTicks = currentTime * 10000000; // Convert to ticks

  const activeSubtitle = useMemo(() => {
    if (!subtitleData) return null;

    const delayTicks = subtitleDelayMs * 10000; // Convert delay from ms to ticks

    interface SubtitleEvent {
      StartPositionTicks: number;
      EndPositionTicks?: number;
      Text: string;
      [key: string]: unknown;
    }

    const validSubs: SubtitleEvent[] = (subtitleData as SubtitleEvent[])
      .filter((sub: SubtitleEvent) => sub.StartPositionTicks)
      .sort(
        (a: SubtitleEvent, b: SubtitleEvent) =>
          a.StartPositionTicks - b.StartPositionTicks
      );

    for (let i = 0; i < validSubs.length; i++) {
      const sub = validSubs[i];
      const nextSub = validSubs[i + 1];

      const startTimeWithDelay = sub.StartPositionTicks + delayTicks;
      let endTimeWithDelay = (sub.EndPositionTicks ?? nextSub?.StartPositionTicks ?? sub.StartPositionTicks + 50000000) + delayTicks; // 5 seconds in ticks default duration

      // Ensure end time is after start time, even with delay
      if (endTimeWithDelay < startTimeWithDelay) {
        endTimeWithDelay = startTimeWithDelay + 10000; // a minimal duration if delay makes it invalid
      }
      
      if (currentTicks >= startTimeWithDelay && currentTicks < endTimeWithDelay) {
        return sub; // Return the original sub, the timing check is delayed
      }
    }
    return null;
  }, [currentTicks, subtitleData, subtitleDelayMs]);

  type SanitizeAndFormat = (text: string) => string;

  const sanitizeAndFormat: SanitizeAndFormat = (text) => {
    const withLineBreaks = text.replace(/\r\n/g, "<br>");
    return DOMPurify.sanitize(withLineBreaks, {
      ALLOWED_TAGS: ["i", "em", "b", "strong", "br"],
      ALLOWED_ATTR: [],
    });
  };

  const overlayHtml = (() => {
    if (usingNativeCues && nativeCueText) {
      return sanitizeAndFormat(nativeCueText);
    }
    if (activeSubtitle) {
      return sanitizeAndFormat(activeSubtitle.Text);
    }
    return null;
  })();

  if (!overlayHtml) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-24">
      <div
        className="absolute bottom-10 w-auto text-center text-white p-2 rounded"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: `${fontSize}px`,
          maxWidth: "90vw",
          lineHeight: 1.25,
          wordBreak: "break-word",
          pointerEvents: "none",
          // Remove background, keep strong text shadow for readability
          textShadow:
            "0 2px 8px #000, 0 0px 2px #000, 0 0px 8px #000, 0 0px 16px #000, 0 0px 32px #000",
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: overlayHtml }} />
      </div>
    </div>
  );
};

export default SubtitleTrack;
