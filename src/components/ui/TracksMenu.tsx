import clsx from "clsx";
import {Captions, Check, Settings} from "lucide-react";
import React, {useEffect, useRef} from "react";
import {MediaStream} from "../../types/jellyfin";

type AudioTrack = {
    id: number;
    label: string;
    language: string;
};

interface TracksMenuProps {
    audioTracks: AudioTrack[],
    selectedAudioTrack: number,
    setSelectedAudioTrack: (id: number) => void,
    subtitleTracks: MediaStream[],
    selectedSubtitleIndex: number | null,
    setSelectedSubtitleIndex: (index: number | null) => void,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    maxRes?: undefined | number,
    selectedRes?: undefined | number,
    setResolution: (resolution: number | undefined) => void,
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
                                                   maxRes,
                                                   selectedRes,
                                                   setResolution
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


    {/* Bitrate options */
    }

    type ResolutionOption = {
        name: string;
        resolution: string;
        height: number; // used for comparison like "1080", "720"
        minBitrate: number; // in bps
        maxBitrate: number; // in bps
    };

    const resolutions: ResolutionOption[] = [
        {name: "480p", resolution: "854x480", height: 480, minBitrate: 1_000_000, maxBitrate: 4_000_000},
        {name: "720p", resolution: "1280x720", height: 720, minBitrate: 2_500_000, maxBitrate: 7_500_000},
        {name: "1080p", resolution: "1920x1080", height: 1080, minBitrate: 4_000_000, maxBitrate: 12_000_000},
        {name: "1440p", resolution: "2560x1440", height: 1440, minBitrate: 10_000_000, maxBitrate: 24_000_000},
        {name: "2160p", resolution: "3840x2160", height: 2160, minBitrate: 25_000_000, maxBitrate: 60_000_000},
        {name: "8K", resolution: "7680x4320", height: 4320, minBitrate: 50_000_000, maxBitrate: 120_000_000},
    ];

    function getAvailableResolutions(maxBitrate: number, maxResHeight: number): ResolutionOption[] {
        return resolutions.filter(res =>
            res.minBitrate <= maxBitrate && res.height <= maxResHeight
        );
    }

// Example usage:
    const maxBitrate = 10_000_000; // 10 Mbps
    const available = getAvailableResolutions(maxBitrate, Number(maxRes)).reverse();


    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-white hover:text-gray-300 transition-colors mr-2 mt-2"
                title="Tracks"
            >
        <span className="flex items-center gap-1">
          <Captions size={24}/>
        </span>
            </button>
            {isOpen && (
                <div
                    className="absolute right-0 bottom-10 w-[300px] bg-neutral-900 text-white text-sm rounded shadow-lg p-2 z-50 flex gap-4 flex-col">
                    {/* Bitrate */}
                    {(
                        <div className="flex-1 min-w-[180px]">
                            <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 border-b border-neutral-700">
                                Bitrate
                            </h3>
                            <ul className="py-1 max-h-40 overflow-y-auto">
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setResolution(undefined);
                                            setIsOpen(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 rounded text-left",
                                            selectedRes === undefined && "font-semibold"
                                        )}
                                    >
                                        <span>Full</span>
                                        {selectedRes === undefined && <Check size={16}/>}
                                    </button>
                                </li>
                                {available.map((resolution: ResolutionOption, index) => (
                                    <li key={index}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setResolution(resolution.height);
                                                setIsOpen(false);
                                            }}
                                            className={clsx(
                                                "w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 rounded text-left",
                                                selectedRes === resolution.height && "font-semibold"
                                            )}
                                        >
                                            <span>{resolution.name}</span>
                                            {selectedRes === resolution.height && <Check size={16}/>}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

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
                                            {selectedAudioTrack === track.id && <Check size={16}/>}
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
                                        {selectedSubtitleIndex === null && <Check size={16}/>}
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
                                            <span>{track.DisplayTitle ?? `Subtitle ${track.Index}`}</span>
                                            {selectedSubtitleIndex === track.Index && (
                                                <Check size={16}/>
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
