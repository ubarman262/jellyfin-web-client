import clsx from "clsx";
import { Captions, Check } from "lucide-react";
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
  selectedSubtitleIndex: number | string | null;
  setSelectedSubtitleIndex: (index: number | string | null) => void;
  onSelectLocalSubtitle: (file: File) => void;
  localSubtitleName?: string | null;
  subtitleDelayMs: number;
  increaseSubtitleDelay: () => void;
  decreaseSubtitleDelay: () => void;
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
  onSelectLocalSubtitle,
  localSubtitleName,
  subtitleDelayMs,
  increaseSubtitleDelay,
  decreaseSubtitleDelay,
  isOpen,
  setIsOpen,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const truncateName = (name: string, maxLength = 15) => {
    if (name.length <= maxLength) {
      return name;
    }
    return `${name.substring(0, maxLength - 3)}...`;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

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
        <div
          className="absolute right-0 bottom-10 w-[420px] bg-neutral-900 text-white text-sm rounded shadow-lg p-2 z-50 flex flex-row gap-4"
          onDoubleClick={(e) => e.stopPropagation()}
        >
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
          {/* This section should always be visible to allow uploading local subtitles and turning them off */}
          <div className="flex-1 min-w-[180px]">
            <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 border-b border-neutral-700">
              Subtitles
              </h3>
              <ul className="py-1 max-h-40 overflow-y-auto">
                <li>
                  <input
                    type="file"
                    accept=".vtt,.srt"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onSelectLocalSubtitle(e.target.files[0]);
                        setIsOpen(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-start px-3 py-2 cursor-pointer hover:bg-white/10 rounded text-left"
                  >
                    Upload Local Subtitle
                  </button>
                </li>
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
                {localSubtitleName && (
                  <li key="local-subtitle-item">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubtitleIndex("local");
                        setIsOpen(false);
                      }}
                      className={clsx(
                        "w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 rounded text-left",
                        selectedSubtitleIndex === "local" && "font-semibold"
                      )}
                      aria-pressed={selectedSubtitleIndex === "local"}
                    >
                      <span>{truncateName(localSubtitleName)} (Local)</span>
                      {selectedSubtitleIndex === "local" && <Check size={16} />}
                    </button>
                  </li>
                )}
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
                      <span>{truncateName(track.Title ?? `Subtitle ${track.Index}`)}</span>
                      {selectedSubtitleIndex === track.Index && (
                        <Check size={16} />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {/* Subtitle Offset Controls */}
              {selectedSubtitleIndex !== null && (
                <div className="mt-2 pt-2 border-t border-neutral-700">
                  <h4 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-1">
                    Subtitle Delay
                  </h4>
                  <div className="flex items-center justify-between px-3 py-1">
                    <button
                      type="button"
                      onClick={decreaseSubtitleDelay}
                      className="px-2 py-1 hover:bg-white/10 rounded"
                      aria-label="Decrease subtitle delay (subtitles appear earlier)"
                    >
                      -
                    </button>
                    <span className="text-xs tabular-nums">
                      {subtitleDelayMs > 0 ? "+" : ""}
                      {(subtitleDelayMs / 1000).toFixed(1)}s
                    </span>
                    <button
                      type="button"
                      onClick={increaseSubtitleDelay}
                      className="px-2 py-1 hover:bg-white/10 rounded"
                      aria-label="Increase subtitle delay (subtitles appear later)"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
};

export default TracksMenu;
