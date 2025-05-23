import DOMPurify from "dompurify";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { MediaStream } from "../../types/jellyfin";

// Props: subtitleTracks, selectedSubtitleIndex, itemId, api, currentTime
type SubtitleTrackProps = {
  subtitleTracks: MediaStream[];
  selectedSubtitleIndex: number | null;
  itemId: string;
  currentTime: number;
};

const SubtitleTrack = ({
  subtitleTracks,
  selectedSubtitleIndex,
  itemId,
  currentTime,
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

  useEffect(() => {
    const fetchSubtitle = async () => {
      if (
        !api ||
        !itemId ||
        selectedSubtitleIndex === null ||
        !subtitleTracks?.length
      ) {
        setSubtitleData(null);
        return;
      }
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
    };
    fetchSubtitle();
  }, [api, itemId, selectedSubtitleIndex, subtitleTracks]);

  const currentTicks = currentTime * 10000000; // Convert to ticks

  const activeSubtitle = useMemo(() => {
    if (!subtitleData) return null;
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

      const endTicks =
        sub.EndPositionTicks ??
        nextSub?.StartPositionTicks ??
        sub.StartPositionTicks + 50000000; // 5 seconds in ticks

      if (currentTicks >= sub.StartPositionTicks && currentTicks < endTicks) {
        return sub;
      }
    }
    return null;
  }, [currentTicks, subtitleData]);

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
