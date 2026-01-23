import clsx from "clsx";
import { Download, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  CultureInfo,
  MediaItem,
  MediaStream,
  RemoteSubtitleInfo,
} from "../../types/jellyfin";

interface SubtitleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaItem;
  subtitleTracks: MediaStream[];
  onSubtitlesUpdated: () => void;
}

const SubtitleEditModal: React.FC<SubtitleEditModalProps> = ({
  isOpen,
  onClose,
  item,
  subtitleTracks,
  onSubtitlesUpdated,
}) => {
  const { api } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [languages, setLanguages] = useState<CultureInfo[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("eng");
  const [remoteSubtitles, setRemoteSubtitles] = useState<RemoteSubtitleInfo[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isDeletingTrack, setIsDeletingTrack] = useState<number | null>(null);
  const [localSubtitleTracks, setLocalSubtitleTracks] =
    useState<MediaStream[]>(subtitleTracks);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load available languages on mount
  useEffect(() => {
    const loadLanguages = async () => {
      if (!api) return;
      try {
        const cultures = await api.getLocalizationCultures();
        setLanguages(cultures);
      } catch (error) {
        console.error("Failed to load languages:", error);
      }
    };

    if (isOpen && api) {
      loadLanguages();
    }
  }, [isOpen, api]);

  // Close modal on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Update local tracks when props change
  useEffect(() => {
    setLocalSubtitleTracks(subtitleTracks);
  }, [subtitleTracks]);

  const searchRemoteSubtitles = async () => {
    if (!api || !selectedLanguage) return;

    setIsSearching(true);
    try {
      const results = await api.searchRemoteSubtitles(
        item.Id,
        selectedLanguage,
      );
      setRemoteSubtitles(results);
    } catch (error) {
      console.error("Failed to search remote subtitles:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const downloadRemoteSubtitle = async (subtitleId: string) => {
    if (!api) return;

    setIsDownloading(subtitleId);
    setMessage(null);
    try {
      console.log("Downloading subtitle:", subtitleId);
      await api.downloadRemoteSubtitle(item.Id, subtitleId);
      console.log("Download successful, refreshing tracks...");

      // Add a small delay to ensure the server has processed the download
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Refresh subtitle tracks locally - pass the full item object
      const updatedTracks = await api.fetchSubtitleTracks(item);
      console.log("Updated tracks:", updatedTracks);
      setLocalSubtitleTracks(updatedTracks);

      // Also update the parent component
      onSubtitlesUpdated();
      setMessage({
        type: "success",
        text: `Subtitle downloaded successfully! (${updatedTracks.length} tracks)`,
      });
    } catch (error) {
      console.error("Failed to download subtitle:", error);
      setMessage({
        type: "error",
        text: "Failed to download subtitle. Please try again.",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !api) return;

    setIsUploading(true);
    setMessage(null);
    try {
      await api.uploadSubtitleToServer(
        item.Id,
        file,
        selectedLanguage,
        false,
        false,
      );
      // Refresh subtitle tracks locally - pass the full item object
      const updatedTracks = await api.fetchSubtitleTracks(item);
      setLocalSubtitleTracks(updatedTracks);
      // Also update the parent component
      onSubtitlesUpdated();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessage({ type: "success", text: "Subtitle uploaded successfully!" });
    } catch (error) {
      console.error("Failed to upload subtitle:", error);
      setMessage({
        type: "error",
        text: "Failed to upload subtitle. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteSubtitleTrack = async (index: number) => {
    if (!api) return;

    if (!confirm("Are you sure you want to delete this subtitle track?")) {
      return;
    }

    setIsDeletingTrack(index);
    setMessage(null);
    try {
      await api.deleteSubtitleTrack(item.Id, index);
      // Refresh subtitle tracks locally - pass the full item object
      const updatedTracks = await api.fetchSubtitleTracks(item);
      setLocalSubtitleTracks(updatedTracks);
      // Also update the parent component
      onSubtitlesUpdated();
      setMessage({
        type: "success",
        text: "Subtitle track deleted successfully!",
      });
    } catch (error) {
      console.error("Failed to delete subtitle track:", error);
      setMessage({
        type: "error",
        text: "Failed to delete subtitle track. Please try again.",
      });
    } finally {
      setIsDeletingTrack(null);
    }
  };

  const truncateName = (name: string, maxLength = 25) => {
    if (name.length <= maxLength) {
      return name;
    }
    return `${name.substring(0, maxLength - 3)}...`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-neutral-900 text-white rounded shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-lg font-medium">Subtitle Manager</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Bar */}
        {message && (
          <div
            className={clsx(
              "px-4 py-2 text-sm border-b border-neutral-700",
              message.type === "success"
                ? "bg-green-600/20 text-green-400"
                : "bg-red-600/20 text-red-400",
            )}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-row max-h-[calc(90vh-60px)]">
          {/* Left Panel - Search & Upload */}
          <div className="w-1/2 p-4 border-r border-neutral-700">
            {/* Language Selection */}
            <div className="mb-4">
              <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 mb-2 border-b border-neutral-700">
                Language
              </h3>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
              >
                {languages.map((lang) => (
                  <option
                    key={lang.ThreeLetterISOLanguageName}
                    value={lang.ThreeLetterISOLanguageName}
                  >
                    {lang.DisplayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Remote Subtitles */}
            <div className="mb-4">
              <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 mb-2 border-b border-neutral-700">
                Search Online
              </h3>
              <button
                onClick={searchRemoteSubtitles}
                disabled={isSearching}
                className={clsx(
                  "w-full px-3 py-2 text-sm rounded transition-colors",
                  isSearching
                    ? "bg-neutral-600 text-neutral-400 cursor-not-allowed"
                    : "bg-[#ef4444] hover:bg-red-700 text-white",
                )}
              >
                {isSearching ? "Searching..." : "Search Subtitles"}
              </button>
            </div>

            {/* Upload Local File */}
            <div className="mb-4">
              <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 mb-2 border-b border-neutral-700">
                Upload File
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.ass,.ssa"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-neutral-700 file:text-neutral-300 hover:file:bg-neutral-600 disabled:opacity-50"
              />
              {isUploading && (
                <p className="text-xs text-neutral-400 mt-2">Uploading...</p>
              )}
            </div>

            {/* Remote Search Results */}
            {remoteSubtitles.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 mb-2 border-b border-neutral-700">
                  Search Results ({remoteSubtitles.length})
                </h3>
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {remoteSubtitles.map((subtitle) => (
                    <li key={subtitle.Id}>
                      <div className="bg-neutral-800 rounded px-3 py-2 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {truncateName(subtitle.Name)}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {subtitle.ProviderName} •{" "}
                            {subtitle.Format?.toUpperCase()}
                            {subtitle.DownloadCount &&
                              ` • ${subtitle.DownloadCount} downloads`}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadRemoteSubtitle(subtitle.Id)}
                          disabled={isDownloading === subtitle.Id}
                          className={clsx(
                            "ml-2 p-2 rounded text-xs transition-colors",
                            isDownloading === subtitle.Id
                              ? "bg-neutral-600 text-neutral-400 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700 text-white",
                          )}
                        >
                          {isDownloading === subtitle.Id ? (
                            <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                          ) : (
                            <Download size={12} />
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Panel - Current Subtitles */}
          <div className="w-1/2 p-4">
            <h3 className="text-xs uppercase tracking-wide text-neutral-400 px-2 pb-2 mb-4 border-b border-neutral-700">
              Current Subtitles ({localSubtitleTracks.length})
            </h3>
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {localSubtitleTracks.length === 0 ? (
                <li className="text-neutral-400 text-center py-8 text-sm">
                  No subtitle tracks found
                </li>
              ) : (
                localSubtitleTracks.map((track) => (
                  <li key={track.Index}>
                    <div className="bg-neutral-800 rounded px-3 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {track.DisplayTitle || `Track ${track.Index}`}
                        </p>
                        <div className="text-xs text-neutral-400 space-y-0.5 mt-1">
                          <p>Language: {track.Language || "Unknown"}</p>
                          {track.Codec && (
                            <p>Format: {track.Codec.toUpperCase()}</p>
                          )}
                          <div className="flex gap-2">
                            {track.IsExternal && (
                              <span className="bg-neutral-700 px-1.5 py-0.5 rounded text-xs">
                                External
                              </span>
                            )}
                            {track.IsForced && (
                              <span className="bg-yellow-600/20 text-yellow-400 px-1.5 py-0.5 rounded text-xs">
                                Forced
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {track.IsExternal && (
                        <button
                          onClick={() => deleteSubtitleTrack(track.Index)}
                          disabled={isDeletingTrack === track.Index}
                          className="ml-3 text-red-400 hover:text-red-300 disabled:text-neutral-500 transition-colors p-1"
                          title="Delete subtitle track"
                        >
                          {isDeletingTrack === track.Index ? (
                            <div className="animate-spin w-4 h-4 border border-current border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubtitleEditModal;
