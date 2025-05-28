import clsx from "clsx";
import { Captions, Check, Settings } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { MediaStream } from "../../types/jellyfin";

type AudioTrack = {
  id: number;
  label: string;
  language: string;
};

interface TracksMenuProps {
  audioTracks: AudioTrack[];
  selectedAudioTrack: number;
  setSelectedAudioTrack: (id: number) => void;
  subtitleTracks: MediaStream[];
  selectedSubtitleIndex: number | null;
  setSelectedSubtitleIndex: (index: number | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const TracksMenu: React.FC<TracksMenuProps> = ({
  audioTracks,
  selectedAudioTrack,
  setSelectedAudioTrack,
  subtitleTracks,
  selectedSubtitleIndex,
  setSelectedSubtitleIndex,
  isOpen,
  setIsOpen,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  if (audioTracks.length <= 1 && subtitleTracks.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:text-gray-300 transition-colors mr-2 mt-2"
        title="Tracks"
      >
        <span className="flex items-center gap-1">
          <Captions size={24} />
        </span>
      </button>
      {isOpen && (
        <div className="absolute right-0 bottom-10 w-[420px] bg-neutral-900 text-white text-sm rounded shadow-lg p-2 z-50 flex flex-row gap-4">
          {/* Audio Tracks */}
          {audioTracks.length > 1 && (
            <div className="flex-1 min-w-[180px]">
              <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 border-b border-neutral-700">
                Audio Tracks
              </h3>
              <ul className="py-1 max-h-40 overflow-y-auto">
                {audioTracks.map((track) => (
                  <li key={track.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAudioTrack(track.id);
                        setIsOpen(false);
                      }}
                      className={clsx(
                        "w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 rounded text-left",
                        selectedAudioTrack === track.id && "font-semibold"
                      )}
                      aria-pressed={selectedAudioTrack === track.id}
                    >
                      <span>
                        {track.label}{" "}
                        {track.language ? `(${track.language})` : ""}
                      </span>
                      {selectedAudioTrack === track.id && <Check size={16} />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Subtitle Tracks */}
          {subtitleTracks.length > 0 && (
            <div className="flex-1 min-w-[180px]">
              <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 border-b border-neutral-700">
                Subtitles
              </h3>
              <ul className="py-1 max-h-40 overflow-y-auto">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubtitleIndex(null);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 rounded text-left",
                      selectedSubtitleIndex === null && "font-semibold"
                    )}
                    aria-pressed={selectedSubtitleIndex === null}
                  >
                    <span>Off</span>
                    {selectedSubtitleIndex === null && <Check size={16} />}
                  </button>
                </li>
                {subtitleTracks.map((track) => (
                  <li key={track.Index}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubtitleIndex(track.Index);
                        setIsOpen(false);
                      }}
                      className={clsx(
                        "w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 rounded text-left",
                        selectedSubtitleIndex === track.Index && "font-semibold"
                      )}
                      aria-pressed={selectedSubtitleIndex === track.Index}
                    >
                      <span>{track.Title ?? `Subtitle ${track.Index}`}</span>
                      {selectedSubtitleIndex === track.Index && (
                        <Check size={16} />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TracksMenu;
