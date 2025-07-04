"use client";
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Song } from '@/services/api';

interface AudioPlayerProps {
  currentSong: Song | null;
  defaultArtworkUrl?: string;
  onSongEnd?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSongLoaded?: () => void;
}

export default function AudioPlayer({ currentSong, defaultArtworkUrl, onSongEnd, onNext, onPrevious, onSongLoaded }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Reset player when song changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      setIsLoading(true);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      
      // Load the new audio
      audioRef.current.load();
      
      // Auto-play the new song
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
            onSongLoaded?.();
          })
          .catch((error) => {
            console.error('Error playing audio:', error);
            setIsLoading(false);
            setIsPlaying(false);
          });
      }
    }
  }, [currentSong, onSongLoaded]);

  // Handle play/pause
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error toggling play:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      onSongLoaded?.();
    }
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  // Handle mute toggle
  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Handle song end
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    onSongEnd?.();
  };

  // Format time helper
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg">
      <audio
        ref={audioRef}
        src={currentSong.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center gap-4 max-w-4xl mx-auto">
        {/* Song Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img 
            src={currentSong.artwork_url || defaultArtworkUrl || '/default-album-art.jpg'} 
            alt={currentSong.album_title + ' cover'} 
            className="w-12 h-12 rounded object-cover border"
            onError={(e) => {
              if (defaultArtworkUrl) {
                e.currentTarget.src = defaultArtworkUrl;
              }
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate text-gray-900 dark:text-white flex items-center gap-2">
              {currentSong.title}
              {currentSong.genre && (
                <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{currentSong.genre}</span>
              )}
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-sm truncate">
              {currentSong.artist_name} • {currentSong.album_title || 'Unknown Album'}
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onPrevious}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Previous"
            disabled={isLoading}
          >
            <SkipBack size={20} />
          </button>
          
          <button 
            onClick={togglePlay}
            disabled={isLoading}
            className={`p-3 rounded-full transition-colors ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title={isLoading ? 'Loading...' : (isPlaying ? 'Pause' : 'Play')}
          >
            {isLoading ? (
              <div className="w-5 h-5 flex items-center justify-center">
                <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            ) : isPlaying ? (
              <div className="w-5 h-5 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-0.5 bg-white dark:bg-blue-200 rounded-full animate-sound-bar-1"></div>
                  <div className="w-0.5 bg-white dark:bg-blue-200 rounded-full animate-sound-bar-2"></div>
                  <div className="w-0.5 bg-white dark:bg-blue-200 rounded-full animate-sound-bar-3"></div>
                  <div className="w-0.5 bg-white dark:bg-blue-200 rounded-full animate-sound-bar-4"></div>
                </div>
              </div>
            ) : (
              <Play size={20} />
            )}
          </button>
          
          <button 
            onClick={onNext}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Next"
            disabled={isLoading}
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-gray-500 w-10">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, #e5e7eb ${(currentTime / (duration || 1)) * 100}%, #e5e7eb 100%)`
            }}
          />
          <span className="text-xs text-gray-500 w-10">{formatTime(duration)}</span>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleMute}
            className="p-2 hover:bg-gray-100 rounded-full"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
        
        @keyframes soundBar1 {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @keyframes soundBar2 {
          0%, 100% { height: 8px; }
          50% { height: 12px; }
        }
        @keyframes soundBar3 {
          0%, 100% { height: 12px; }
          50% { height: 8px; }
        }
        @keyframes soundBar4 {
          0%, 100% { height: 16px; }
          50% { height: 4px; }
        }
        .animate-sound-bar-1 {
          animation: soundBar1 1s ease-in-out infinite;
        }
        .animate-sound-bar-2 {
          animation: soundBar2 1s ease-in-out infinite 0.1s;
        }
        .animate-sound-bar-3 {
          animation: soundBar3 1s ease-in-out infinite 0.2s;
        }
        .animate-sound-bar-4 {
          animation: soundBar4 1s ease-in-out infinite 0.3s;
        }
      `}</style>
    </div>
  );
} 