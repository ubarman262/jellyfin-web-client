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
};

const SubtitleTrack = ({
  subtitleTracks,
  selectedSubtitleIndex,
  itemId,
  currentTime,
  localSubtitleFileUrl,
  subtitleDelayMs,
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
  }, [api, itemId, selectedSubtitleIndex, subtitleTracks, localSubtitleFileUrl]);

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

  if (!activeSubtitle) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute bottom-10 w-auto text-center text-white text-xl bg-black/50 p-2">
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeAndFormat(activeSubtitle.Text),
          }}
        />
      </div>
    </div>
  );
};

export default SubtitleTrack;
