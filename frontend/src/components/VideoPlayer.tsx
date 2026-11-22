import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface VideoPlayerProps {
  src: string | null;
  lessonId: number;
  isCompleted: boolean;
  resumePosition: number;
  onComplete: () => void;
  onPositionChange?: (pos: number) => void;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/(?:vimeo\.com\/)(\d+)/);
  return match ? match[1] : null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  lessonId,
  isCompleted,
  resumePosition,
  onComplete,
  onPositionChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const positionRef = useRef<number>(resumePosition);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const trimmedSrc = src?.trim() || '';
  const ytId = trimmedSrc ? getYouTubeId(trimmedSrc) : null;
  const vimeoId = trimmedSrc ? getVimeoId(trimmedSrc) : null;
  const isHls = trimmedSrc.toLowerCase().includes('.m3u8');
  const isIframe = Boolean(ytId || vimeoId);

  // Keep positionRef synced with prop changes
  useEffect(() => {
    positionRef.current = resumePosition;
  }, [resumePosition, lessonId]);

  // Save playback position on unmount
  useEffect(() => {
    return () => {
      if (positionRef.current > 0 && onPositionChange) {
        onPositionChange(positionRef.current);
      }
    };
  }, [lessonId, onPositionChange]);

  // HLS / Native video source setup
  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
    setIsPlaying(false);

    if (isIframe || !trimmedSrc) return;

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(trimmedSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setHasError(true);
            setErrorMessage(`Stream playback error (${data.type})`);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Safari HLS
        video.src = trimmedSrc;
      } else {
        setHasError(true);
        setErrorMessage('HLS playback is not supported in this browser.');
      }
    } else {
      video.src = trimmedSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [trimmedSrc, isHls, isIframe]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (resumePosition > 4 && video.duration && resumePosition < video.duration - 2) {
      video.currentTime = resumePosition;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const current = Math.floor(video.currentTime);
    positionRef.current = current;
    if (onPositionChange && current % 5 === 0) {
      onPositionChange(current);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (onPositionChange && positionRef.current > 0) {
      onPositionChange(positionRef.current);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onPositionChange && videoRef.current) {
      onPositionChange(Math.floor(videoRef.current.duration || 0));
    }
    if (!isCompleted) {
      onComplete();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const retryPlayback = () => {
    setHasError(false);
    setErrorMessage('');
    const video = videoRef.current;
    if (video && trimmedSrc) {
      video.load();
    }
  };

  if (!trimmedSrc) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[#E3D8BE]/80 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-[#D9A52E] mb-3 opacity-60" />
        <p className="text-sm">No video source configured for this lecture.</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h4 className="font-bold text-base mb-1">Playback Error</h4>
        <p className="text-xs text-[#E3D8BE]/70 max-w-md mb-4">{errorMessage || 'Unable to play this video stream.'}</p>
        <button
          onClick={retryPlayback}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#D9A52E] text-[#061426] rounded font-bold text-xs hover:bg-[#c29325] transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  // YouTube / Vimeo Iframe
  if (isIframe) {
    const embedUrl = ytId
      ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`
      : `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;

    return (
      <div className="w-full h-full flex flex-col bg-black">
        <div className="flex-1 w-full min-h-0 relative">
          <iframe
            src={embedUrl}
            title="Video lecture"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0 absolute inset-0"
          />
        </div>
        <div className="p-3 bg-[#061426] border-t border-[#1C2C42] flex items-center justify-between text-xs text-[#E3D8BE]">
          <span className="text-[11px] text-[#A2B3C8]">
            External player (YouTube / Vimeo). Mark completion manually:
          </span>
          <button
            onClick={onComplete}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition ${
              isCompleted
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                : 'bg-[#D9A52E] text-[#061426] hover:bg-[#c29325]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isCompleted ? 'Completed' : 'Mark Complete'}
          </button>
        </div>
      </div>
    );
  }

  // Native / HLS player
  return (
    <div className="relative w-full h-full bg-black flex flex-col justify-between group">
      <video
        ref={videoRef}
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onPlay={() => setIsPlaying(true)}
        onEnded={handleEnded}
        onError={() => {
          setHasError(true);
          setErrorMessage('Video failed to load or format not supported.');
        }}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer flex-1 min-h-0"
      />

      {/* Floating control bar on bottom */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-1.5 bg-[#D9A52E] text-[#061426] rounded-full hover:bg-[#c29325] transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <div className="flex items-center gap-1 text-[11px] text-[#E3D8BE]">
            <span>Speed:</span>
            {[0.75, 1, 1.25, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  playbackSpeed === s ? 'bg-[#D9A52E] text-[#061426]' : 'text-[#E3D8BE]/70 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onComplete}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition ${
            isCompleted
              ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
              : 'bg-[#D9A52E] text-[#061426] hover:bg-[#c29325]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isCompleted ? 'Done' : 'Mark Complete'}
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;
