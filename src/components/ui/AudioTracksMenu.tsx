import React, { useRef, useEffect } from "react";
import clsx from "clsx";
import { Headphones, Check } from "lucide-react";

type AudioTrack = {
  id: number;
  label: string;
  language: string;
};

interface AudioTracksMenuProps {
  audioTracks: AudioTrack[];
  selectedAudioTrack: number;
  setSelectedAudioTrack: (id: number) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AudioTracksMenu: React.FC<AudioTracksMenuProps> = ({
  audioTracks,
  selectedAudioTrack,
  setSelectedAudioTrack,
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

  if (audioTracks.length <= 1) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:text-gray-300 transition-colors mr-2 mt-1"
        title="Audio Tracks"
      >
        <Headphones size={22} />
      </button>
      {isOpen && (
        <div className="absolute right-0 bottom-10 w-48 bg-neutral-900 text-white text-sm rounded shadow-lg p-2 z-50">
          <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 border-b border-neutral-700">
            Audio Tracks
          </h3>
          <ul className="py-1 max-h-64 overflow-y-auto">
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
                    {track.label} {track.language ? `(${track.language})` : ""}
                  </span>
                  {selectedAudioTrack === track.id && <Check size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AudioTracksMenu;
