import clsx from "clsx";
import { Captions, Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { JellyfinSubtitleStream } from "../../types/jellyfin";

export default function SubtitlesMenu({
  subtitleTracks,
  selectedSubtitleIndex,
  setSelectedSubtitleIndex,
  setIsOpen,
  isOpen,
}: Readonly<{
  subtitleTracks: readonly JellyfinSubtitleStream[];
  selectedSubtitleIndex: number | null;
  setSelectedSubtitleIndex: (index: number | null) => void;
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
}>) {
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

  if (!subtitleTracks.length) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:text-gray-300 transition-colors mr-2 mt-1"
        title="Subtitles"
      >
        <Captions size={26} />
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-10 w-48 bg-neutral-900 text-white text-sm rounded shadow-lg p-2 z-50">
          <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 border-b border-neutral-700">
            Subtitles
          </h3>
          <ul className="py-1 max-h-64 overflow-y-auto">
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
                  {selectedSubtitleIndex === track.Index && <Check size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
