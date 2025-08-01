"use client";
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { Song } from '@/services/api';

interface AudioPlayerProps {
  currentSong: Song | null;
  defaultArtworkUrl?: string;
  onSongEnd?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSongLoaded?: () => void;
  forcePlay?: boolean;
  playlist?: Song[];
  currentPlaylistIndex?: number;
  onPlaylistIndexChange?: (index: number) => void;
  shuffleMode?: boolean;
  repeatMode?: 'none' | 'one' | 'all';
  onShuffleToggle?: () => void;
  onRepeatToggle?: () => void;
}

export default function AudioPlayer({ currentSong, defaultArtworkUrl, onSongEnd, onNext, onPrevious, onSongLoaded, forcePlay, playlist, currentPlaylistIndex, onPlaylistIndexChange, shuffleMode, repeatMode, onShuffleToggle, onRepeatToggle }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayRequestPending, setIsPlayRequestPending] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRequestRef = useRef<Promise<void> | null>(null);
  const currentTimeRef = useRef(0);

  // Reset player when song changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      // Only reset if the song ID has actually changed
      const currentSongId = audioRef.current.dataset.songId;
      if (currentSongId !== currentSong.id?.toString()) {
        // Cancel any pending play request
        if (playRequestRef.current) {
          playRequestRef.current = null;
        }
        setIsPlayRequestPending(false);
        
        setIsLoading(true);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        
        // Load the new audio
        audioRef.current.load();
        audioRef.current.dataset.songId = currentSong.id?.toString() || '';
        
        // Auto-play the new song with proper error handling
        const playAudio = async () => {
          try {
            if (audioRef.current && !isPlayRequestPending) {
              setIsPlayRequestPending(true);
              playRequestRef.current = audioRef.current.play();
              await playRequestRef.current;
              setIsPlaying(true);
              setIsLoading(false);
              onSongLoaded?.();
            }
          } catch (error) {
            console.error('Error playing audio:', error);
            setIsLoading(false);
            setIsPlaying(false);
          } finally {
            setIsPlayRequestPending(false);
            playRequestRef.current = null;
          }
        };
        
        // Small delay to ensure audio is loaded
        setTimeout(playAudio, 100);
      } else if (forcePlay && !isPlayRequestPending) {
        // Force play the same song if forcePlay is true
        const forcePlayAudio = async () => {
          try {
            setIsLoading(true);
            setIsPlayRequestPending(true);
            
            // Ensure audio is loaded and ready
            if (audioRef.current && audioRef.current.readyState === 0) {
              audioRef.current.load();
            }
            
            // Reset current time and pause first to ensure clean state
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.pause();
              
              // Small delay to ensure pause is processed, then play
              setTimeout(async () => {
                if (audioRef.current && !isPlayRequestPending) {
                  playRequestRef.current = audioRef.current.play();
                  await playRequestRef.current;
                  setIsPlaying(true);
                  setIsLoading(false);
                  onSongLoaded?.();
                }
              }, 100);
            }
          } catch (error) {
            console.error('Error force playing audio:', error);
            setIsLoading(false);
            setIsPlaying(false);
          } finally {
            setIsPlayRequestPending(false);
            playRequestRef.current = null;
          }
        };
        
        forcePlayAudio();
      }
    }
  }, [currentSong?.id, onSongLoaded, forcePlay, isPlayRequestPending]);

  // Handle play/pause
  const togglePlay = async () => {
    if (!audioRef.current || !currentSong || isPlayRequestPending) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        setIsPlayRequestPending(true);
        
        // Ensure audio is loaded
        if (audioRef.current.readyState === 0) {
          audioRef.current.load();
        }
        
        playRequestRef.current = audioRef.current.play();
        await playRequestRef.current;
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error toggling play:', error);
      setIsLoading(false);
      setIsPlaying(false);
    } finally {
      setIsPlayRequestPending(false);
    }
  };

  // Sync audio element state with our state
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onSongEnd?.();
      };
      
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [onSongEnd]);

  // Cleanup effect to handle component unmounting
  useEffect(() => {
    return () => {
      // Cancel any pending play request when component unmounts
      if (playRequestRef.current) {
        playRequestRef.current = null;
      }
      setIsPlayRequestPending(false);
    };
  }, []);

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime;
      setCurrentTime(newTime);
      currentTimeRef.current = newTime;
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

  // Handle previous button with smart behavior
  const handlePrevious = () => {
    if (!audioRef.current) return;
    
    console.log('Previous button clicked - Ref currentTime:', currentTimeRef.current, 'State currentTime:', currentTime, 'IsPlaying:', isPlaying);
    
    // Only apply the 5-second rule if the song is actually playing and has been playing for a while
    // If the song just started or is paused, always go to previous song
    if (isPlaying && currentTimeRef.current > 5) {
      console.log('Restarting current song from beginning - NOT switching songs');
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      currentTimeRef.current = 0;
      // Do NOT call onPrevious() - just restart the current song
      return;
    } else {
      console.log('Going to previous song');
      // Go to previous song if:
      // - Song is not playing
      // - Song is within first 5 seconds
      // - Song just started
      onPrevious?.();
    }
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
        data-song-id={currentSong.id?.toString() || ''}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          onSongEnd?.();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center gap-4 max-w-4xl mx-auto">
        {/* Song Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img 
            src={currentSong.artwork_url || defaultArtworkUrl || '/music-icon.svg'} 
            alt={currentSong.album_title + ' cover'} 
            className="w-12 h-12 rounded object-cover border"
            onError={(e) => {
              e.currentTarget.src = '/music-icon.svg';
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
            {playlist && playlist.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {currentPlaylistIndex !== undefined && currentPlaylistIndex >= 0 
                  ? `${currentPlaylistIndex + 1} of ${playlist.length}`
                  : `${playlist.length} songs in playlist`
                }
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Shuffle Button */}
          {playlist && playlist.length > 1 && (
            <button 
              onClick={onShuffleToggle}
              className={`p-2 rounded-full transition-colors ${
                shuffleMode 
                  ? 'bg-blue-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title={shuffleMode ? 'Shuffle On' : 'Shuffle Off'}
            >
              <Shuffle size={16} />
            </button>
          )}
          
          <button 
            onClick={handlePrevious}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors"
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
              <div className="w-5 h-5 flex items-center justify-center">
                <Play size={20} className="ml-0.5" />
              </div>
            )}
          </button>
          
          <button 
            onClick={onNext}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors"
            title="Next"
            disabled={isLoading}
          >
            <SkipForward size={20} />
          </button>
          
          {/* Repeat Button */}
          {playlist && playlist.length > 1 && (
            <button 
              onClick={onRepeatToggle}
              className={`p-2 rounded-full transition-colors ${
                repeatMode !== 'none'
                  ? 'bg-blue-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title={
                repeatMode === 'none' ? 'Repeat Off' :
                repeatMode === 'one' ? 'Repeat One' :
                'Repeat All'
              }
            >
              {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          )}
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors"
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