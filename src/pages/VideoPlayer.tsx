import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { NetflixControls } from '../components/ui/NetflixControls';
import JellyfinApi from '../api/jellyfin';
import { MediaItem, MediaStream } from '../types/jellyfin';
import { Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const serverUrl = localStorage.getItem('jellyfin_server_url') || '';
const apiKey = localStorage.getItem('jellyfin_access_token') || '';
const userId = localStorage.getItem('jellyfin_user_id') || '';

const api = new JellyfinApi({
  serverUrl,
  apiKey,
  userId,
});

const getItemInfo = async (itemId: string) => {
  return api.getMediaItem(itemId);
};

const getPlaybackInfo = async (itemId: string) => {
  return api.getPlaybackInfo(itemId, {});
};

const getHlsStreamUrl = (itemId: string, mediaSourceId: string, maxBitrate?: number, audioStreamIndex?: number, subtitleStreamIndex?: number, playSessionId?: string) => {
  const deviceId = localStorage.getItem("jellyfin_device_id") || 'default-device-id';
  // Construct HLS URL based on the api's getPlaybackUrl method
  const params = new URLSearchParams({
    DeviceId: deviceId,
    MediaSourceId: mediaSourceId,
    api_key: apiKey,
    VideoCodec: 'av1,hevc,h264,vp9',
    AudioCodec: 'aac',
    AudioStreamIndex: audioStreamIndex?.toString() || '0',
    VideoBitrate: maxBitrate?.toString() || '139616000',
    AudioBitrate: '384000',
    MaxFramerate: '23.976025',
    PlaySessionId: playSessionId || `${deviceId}-${Date.now()}`,
    TranscodingMaxAudioChannels: '2',
    RequireAvc: 'false',
    EnableAudioVbrEncoding: 'true',
    SegmentContainer: 'mp4',
    MinSegments: '1',
    BreakOnNonKeyFrames: 'true',
    'h264-level': '40',
    'h264-videobitdepth': '8',
    'h264-profile': 'high',
    'av1-profile': 'main',
    'av1-rangetype': 'SDR,HDR10,HLG',
    'av1-level': '19',
    'vp9-rangetype': 'SDR,HDR10,HLG',
    'hevc-profile': 'main,main10',
    'hevc-rangetype': 'SDR,HDR10,HLG',
    'hevc-level': '183',
    'hevc-deinterlace': 'true',
    'h264-rangetype': 'SDR',
    'h264-deinterlace': 'true',
    TranscodeReasons: 'ContainerNotSupported,AudioCodecNotSupported',
    TranscodingProtocol: 'hls',
    TranscodingContainer: 'ts',
  });

  if (subtitleStreamIndex !== undefined && subtitleStreamIndex !== -1) {
    params.append('SubtitleStreamIndex', subtitleStreamIndex.toString());
  }

  return `${serverUrl}/videos/${itemId}/master.m3u8?${params.toString()}`;
};

const getDirectStreamUrl = (itemId: string, mediaSourceId: string) => {
  const deviceId = localStorage.getItem("jellyfin_device_id") || 'default-device-id';
  const params = new URLSearchParams({
    api_key: apiKey,
    MediaSourceId: mediaSourceId,
    DeviceId: deviceId,
    PlaySessionId: `${deviceId}-${Date.now()}`,
  });
  return `${serverUrl}/Videos/${itemId}/stream?${params.toString()}`;
};

const getSubtitleUrl = (itemId: string, _mediaSourceId: string, subtitleIndex: number) => {
  return `${serverUrl}/Videos/${itemId}/${itemId}/Subtitles/${subtitleIndex}/stream.vtt?api_key=${apiKey}`;
};

const reportPlaybackStart = async (itemId: string, mediaSourceId: string, playSessionId: string, positionTicks: number) => {
  await api.reportPlaying({
    itemId,
    mediaSourceId,
    playSessionId,
    positionTicks,
    isPaused: false,
  });
};

const reportPlaybackProgress = async (_itemId: string, _mediaSourceId: string, _playSessionId: string, positionTicks: number, _isPaused: boolean, _isMuted: boolean, _volumeLevel: number) => {
  await api.reportPlaybackProgress(_itemId, positionTicks / 10000000);
};

const reportPlaybackStopped = async (itemId: string, _mediaSourceId: string, _playSessionId: string, positionTicks: number) => {
  await api.reportPlaybackProgress(itemId, positionTicks / 10000000);
};

export const VideoPlayer: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(-1);
  const [maxBitrate, setMaxBitrate] = useState<number | undefined>(undefined);
  
  const playSessionIdRef = useRef(Math.random().toString(36).substring(7));
  const resumeTimeRef = useRef<number>(0);
  const isFirstLoadRef = useRef<boolean>(true);
  const savedStateRef = useRef<{ time: number; isPlaying: boolean } | null>(null);

  if (!itemId) {
    return <div>Invalid item ID</div>;
  }

  const onBack = () => {
    navigate(-1);
  };
  
  const mediaSource = item?.MediaSources[0];
  const container = mediaSource?.Container?.toLowerCase() || '';

  const defaultAudio = mediaSource?.MediaStreams.find((s: MediaStream) => s.Type === 'Audio' && s.IsDefault);
  const isDefaultAudio = defaultAudio ? currentAudioIndex === defaultAudio.Index : true;

  const selectedSubtitle = mediaSource?.MediaStreams.find((s: MediaStream) => s.Index === currentSubtitleIndex);
  const requiresBurnIn = selectedSubtitle && (
    selectedSubtitle.IsTextSubtitleStream === false || 
    ['pgssub', 'dvdsub', 'dvbsub', 'sup'].includes(selectedSubtitle.Codec?.toLowerCase() || '')
  );

  // Direct play for MP4/WebM, HLS for others (force HLS if bitrate is limited, burn-in needed, or non-default audio selected)
  const isDirectPlay = ['mp4', 'm4v', 'mov', 'webm'].includes(container) && !maxBitrate && !requiresBurnIn && isDefaultAudio;
  const hlsSubtitleIndex = requiresBurnIn ? currentSubtitleIndex : undefined;

  const streamUrl = item && mediaSource ? (
    isDirectPlay 
      ? getDirectStreamUrl(itemId, mediaSource.Id)
      : getHlsStreamUrl(itemId, mediaSource.Id, maxBitrate, currentAudioIndex, hlsSubtitleIndex, playSessionIdRef.current)
  ) : '';

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setLoading(true);
        const [info, playbackInfo] = await Promise.all([
          getItemInfo(itemId),
          getPlaybackInfo(itemId)
        ]);
        
        if (playbackInfo.PlaySessionId) {
          playSessionIdRef.current = playbackInfo.PlaySessionId;
        }

        const pbMediaSource = playbackInfo.MediaSources?.[0];
        
        if (pbMediaSource?.DefaultAudioStreamIndex !== undefined) {
          setCurrentAudioIndex(pbMediaSource.DefaultAudioStreamIndex);
        } else {
          const defaultAudio = info.MediaSources[0]?.MediaStreams.find((s: MediaStream) => s.Type === 'Audio' && s.IsDefault);
          if (defaultAudio) setCurrentAudioIndex(defaultAudio.Index);
        }
        
        if (pbMediaSource?.DefaultSubtitleStreamIndex !== undefined && pbMediaSource.DefaultSubtitleStreamIndex !== -1) {
          setCurrentSubtitleIndex(pbMediaSource.DefaultSubtitleStreamIndex);
        } else if (pbMediaSource?.DefaultSubtitleStreamIndex === -1) {
          setCurrentSubtitleIndex(-1);
        } else {
          const forcedSub = info.MediaSources[0]?.MediaStreams.find((s: MediaStream) => s.Type === 'Subtitle' && s.IsForced);
          const defaultSub = info.MediaSources[0]?.MediaStreams.find((s: MediaStream) => s.Type === 'Subtitle' && s.IsDefault);
          if (forcedSub) {
            setCurrentSubtitleIndex(forcedSub.Index);
          } else if (defaultSub) {
            setCurrentSubtitleIndex(defaultSub.Index);
          }
        }

        if (info.UserData?.PlaybackPositionTicks) {
          resumeTimeRef.current = info.UserData.PlaybackPositionTicks / 10000000;
        }

        setItem({ ...info, MediaSources: playbackInfo.MediaSources });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video information');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [itemId]);

  useEffect(() => {
    if (!item || !videoRef.current || !streamUrl) return;

    const video = videoRef.current;
    
    console.log(`Playing via ${isDirectPlay ? 'Direct Play' : 'HLS'}: ${streamUrl}`);
    
    // Use resumeTimeRef if it's the first load, otherwise use saved state or current video time
    let timeToSeek = video.currentTime;
    let shouldPlay = !video.paused;

    if (isFirstLoadRef.current && resumeTimeRef.current > 0) {
      timeToSeek = resumeTimeRef.current;
      shouldPlay = true; // Autoplay on first load if resuming
      console.log('Resuming from first load:', timeToSeek);
    } else if (savedStateRef.current) {
      timeToSeek = savedStateRef.current.time;
      shouldPlay = savedStateRef.current.isPlaying;
      console.log('Resuming from saved state:', timeToSeek, shouldPlay);
      // Do NOT clear savedStateRef here, clear it only when playback is successfully applied
    } else if (isFirstLoadRef.current) {
      shouldPlay = true; // Autoplay on first load even if not resuming
    }

    let hls: Hls | null = null;

    if (!isDirectPlay && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        startPosition: timeToSeek > 0 ? timeToSeek : -1,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS Manifest Parsed, startPosition was:', timeToSeek);
        // We don't need to set video.currentTime here because startPosition handles it
        if (shouldPlay) {
          video.play().catch(err => {
            console.warn("Autoplay blocked:", err);
            setIsPlaying(false);
          });
        }
        isFirstLoadRef.current = false;
        resumeTimeRef.current = 0;
        savedStateRef.current = null;
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
                console.error("HLS Manifest Error, trying Direct Play fallback...");
                video.src = getDirectStreamUrl(itemId, mediaSource.Id);
              } else {
                setError(`Server transcoding failed (${data.details}). The Jellyfin server crashed while converting the video. Check your server logs or try a different file.`);
                hls?.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("HLS Media Error, attempting recovery...");
              hls?.recoverMediaError();
              break;
            default:
              setError(`Fatal playback error: ${data.details}`);
              hls?.destroy();
              break;
          }
        }
      });
    } else {
      // Native playback (Direct Play or Safari HLS)
      video.src = streamUrl;
      video.load(); // Force reset of readyState for the new source
      
      const applyPlayback = () => {
        console.log('Direct Play ready, seeking to:', timeToSeek);
        if (timeToSeek > 0) {
          video.currentTime = timeToSeek;
        }
        if (shouldPlay) {
          video.play().catch(err => {
            console.warn("Autoplay blocked:", err);
            setIsPlaying(false);
          });
        }
        isFirstLoadRef.current = false;
        resumeTimeRef.current = 0;
        savedStateRef.current = null;
      };

      // Since we called load(), readyState will be 0, but just in case:
      if (video.readyState >= 1) {
        applyPlayback();
      } else {
        video.addEventListener('loadedmetadata', applyPlayback, { once: true });
      }
    }

    return () => {
      // Only save if we don't already have a pending saved state
      // This handles both stream URL changes and Strict Mode unmounting
      if (!savedStateRef.current && videoRef.current) {
        const state = {
          time: videoRef.current.currentTime,
          isPlaying: !videoRef.current.paused
        };
        console.log('Saving playback state in cleanup:', state);
        savedStateRef.current = state;
      }
      if (hls) hls.destroy();
    };
  }, [streamUrl, isDirectPlay, itemId, item]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!item || !mediaSource || !videoRef.current) return;

    const video = videoRef.current;
    let progressInterval: number;
    let hasStarted = false;

    const reportProgress = (isPaused: boolean) => {
      if (!hasStarted) return;
      const positionTicks = Math.floor(video.currentTime * 10000000);
      reportPlaybackProgress(
        itemId,
        mediaSource.Id,
        playSessionIdRef.current,
        positionTicks,
        isPaused,
        video.muted,
        Math.floor(video.volume * 100)
      );
    };

    const handlePlay = () => {
      if (!hasStarted) {
        hasStarted = true;
        const positionTicks = Math.floor(video.currentTime * 10000000);
        reportPlaybackStart(itemId, mediaSource.Id, playSessionIdRef.current, positionTicks);
      } else {
        reportProgress(false);
      }
      
      window.clearInterval(progressInterval);
      progressInterval = window.setInterval(() => {
        reportProgress(false);
      }, 10000); // Report every 10 seconds
    };

    const handlePause = () => {
      window.clearInterval(progressInterval);
      reportProgress(true);
    };

    const handleSeeked = () => {
      if (!video.paused) handlePlay();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handlePause);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      window.clearInterval(progressInterval);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      
      if (hasStarted) {
        const positionTicks = Math.floor(video.currentTime * 10000000);
        reportPlaybackStopped(itemId, mediaSource.Id, playSessionIdRef.current, positionTicks);
      }
    };
  }, [item, mediaSource, itemId]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (v: number) => {
    if (videoRef.current) {
      videoRef.current.volume = v;
      setVolume(v);
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMute = !isMuted;
      videoRef.current.muted = newMute;
      setIsMuted(newMute);
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleAudioChange = (index: number) => {
    setCurrentAudioIndex(index);
    console.log('Switching audio to index:', index);
  };

  const handleSubtitleChange = (index: number) => {
    setCurrentSubtitleIndex(index);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  if (error || !item) {
    const configMissing = !import.meta.env.VITE_JELLYFIN_SERVER_URL || 
                         !import.meta.env.VITE_JELLYFIN_API_KEY || 
                         !import.meta.env.VITE_JELLYFIN_USER_ID;

    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-bold text-red-600">Playback Error</h2>
          <p className="text-xl text-gray-300">{error || 'Unable to load video information'}</p>
          
          {configMissing && (
            <div className="bg-red-900/30 border border-red-600 p-4 rounded text-sm text-left">
              <p className="font-bold text-red-400 mb-2">Missing Configuration:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                {!import.meta.env.VITE_JELLYFIN_SERVER_URL && <li>Server URL is not set</li>}
                {!import.meta.env.VITE_JELLYFIN_API_KEY && <li>API Key is not set</li>}
                {!import.meta.env.VITE_JELLYFIN_USER_ID && <li>User ID is not set</li>}
              </ul>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={onBack} 
              className="bg-red-600 px-6 py-2 rounded font-bold hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-8">
            Tip: If your server uses HTTP, you must open this app in a new tab to bypass security blocks.
          </p>
        </div>
      </div>
    );
  }

  const audioTracks = mediaSource?.MediaStreams.filter((s: MediaStream) => s.Type === 'Audio') || [];
  const subtitleTracks = mediaSource?.MediaStreams.filter((s: MediaStream) => s.Type === 'Subtitle') || [];

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden group">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        crossOrigin="anonymous"
      >
        {currentSubtitleIndex !== -1 && !requiresBurnIn && mediaSource && (
          <track
            key={currentSubtitleIndex}
            kind="subtitles"
            src={getSubtitleUrl(itemId, mediaSource.Id, currentSubtitleIndex)}
            default
            label={subtitleTracks.find((s: MediaStream) => s.Index === currentSubtitleIndex)?.DisplayTitle || 'Subtitles'}
          />
        )}
      </video>

      <NetflixControls
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onSkip={handleSkip}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        title={item.Name}
        onBack={onBack}
        audioTracks={audioTracks}
        subtitles={subtitleTracks}
        currentAudioIndex={currentAudioIndex}
        currentSubtitleIndex={currentSubtitleIndex}
        onAudioChange={handleAudioChange}
        onSubtitleChange={handleSubtitleChange}
        maxBitrate={maxBitrate}
        onBitrateChange={setMaxBitrate}
      />
    </div>
  );
};
