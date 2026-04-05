"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Search, Home, Compass, Library, Heart, ListMusic, 
  MoreVertical, X, AlertCircle, Loader2, Maximize2, Repeat, Shuffle, LogOut,
  Cast, UserCircle, PlayCircle, Plus, ChevronRight, UploadCloud, Clock, 
  Settings, Shield, HelpCircle, MessageSquare, ListVideo, ThumbsUp, Users, Copy, Trash2, Menu
} from 'lucide-react';

const getClientId = () => {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  }
  return '';
};

// Use the environment variable for the socket URL, or fallback to relative path if not set
const SOCKET_URL = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SOCKET_URL : '';

const CATEGORIES = ["Podcasts", "Feel good", "Romance", "Relax", "Energize", "Party", "Workout", "Commute", "Sad", "Focus", "Sleep"];

const SynQplayLogo = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#3B82F6"/>
    <path d="M12.5 10L22.5 16L12.5 22V10Z" fill="white"/>
    <path d="M7.5 16A8.5 8.5 0 0 1 16 7.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M24.5 16A8.5 8.5 0 0 1 16 24.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default function App() {
  const [accessToken, setAccessToken] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedToken = localStorage.getItem('synqplay_token');
    const storedProfile = localStorage.getItem('synqplay_profile');
    const storedExpiry = localStorage.getItem('synqplay_expiry');

    if (storedToken && storedProfile && storedExpiry) {
      if (Date.now() < parseInt(storedExpiry)) {
        setAccessToken(storedToken);
        setUserProfile(JSON.parse(storedProfile));
      } else {
        handleLogout();
      }
    }
  }, []);

  const handleLogout = () => {
    setAccessToken('');
    setUserProfile(null);
    localStorage.removeItem('synqplay_token');
    localStorage.removeItem('synqplay_profile');
    localStorage.removeItem('synqplay_expiry');
    sessionStorage.removeItem('synqplay_session_id');
  };

  if (!isClient) return null;

  if (!accessToken) {
    return <OAuthSetup onLogin={(token, profile) => { 
      setAccessToken(token); 
      setUserProfile(profile); 
      localStorage.setItem('synqplay_token', token);
      localStorage.setItem('synqplay_profile', JSON.stringify(profile));
      localStorage.setItem('synqplay_expiry', (Date.now() + 3500 * 1000).toString()); 
    }} />;
  }

  return <SynQPlayApp accessToken={accessToken} userProfile={userProfile} onLogout={handleLogout} />;
}

function OAuthSetup({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const scriptId = 'google-gsi-client';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  const handleGoogleLogin = () => {
    const clientId = getClientId();
    if (!clientId) return setError("Google Client ID is missing in .env.local");

    setLoading(true);
    setError('');

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/userinfo.profile',
        callback: async (response) => {
          if (response.error) {
            setError("Authentication failed.");
            setLoading(false); return;
          }
          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            });
            const profileData = await profileRes.json();
            onLogin(response.access_token, profileData);
          } catch (err) {
            setError("Failed to fetch user profile.");
            setLoading(false);
          }
        },
        error_callback: () => {
          setError("OAuth popup closed. Please try again.");
          setLoading(false);
        }
      });
      client.requestAccessToken();
    } catch (err) {
      setError("Failed to initialize Google Login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4 font-sans text-white">
      <div className="max-w-md w-full bg-[#121212] p-8 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.1)] border border-white/5">
        <div className="flex flex-col items-center justify-center space-y-4 mb-8">
          <SynQplayLogo className="w-16 h-16 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <span className="text-4xl font-black tracking-tight text-white text-center">SynQplay</span>
        </div>
        <p className="text-sm text-gray-400 mb-8 text-center leading-relaxed px-4">
          Sign in securely with Google to sync your real <b>Liked Music</b> and <b>Playlists</b> directly to your session.
        </p>
        <div className="space-y-4">
          {error && (
            <div className="flex items-start space-x-2 text-red-400 text-sm bg-red-500/10 p-4 rounded-lg border border-red-500/20">
              <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || !scriptLoaded}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-full hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center disabled:opacity-50 disabled:hover:shadow-none"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SynQPlayApp({ accessToken, userProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [myLikedSongs, setMyLikedSongs] = useState([]);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  
  const [player, setPlayer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  
  const [showQueue, setShowQueue] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(0);

  const [sessionId, setSessionId] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected'); // Added socket status tracking
  
  const [roomIsPlaying, setRoomIsPlaying] = useState(false); // Tracks remote play state
  const [localPlayerState, setLocalPlayerState] = useState(-10); // Tracks local YT player state
  
  const currentTrackRef = useRef(null);
  const handleNextAutoplayRef = useRef(null);
  const socketRef = useRef(null); 

  useEffect(() => {
    const savedSessionId = sessionStorage.getItem('synqplay_session_id');
    if (savedSessionId) setSessionId(savedSessionId);
  }, []);

  useEffect(() => {
    if (sessionId) sessionStorage.setItem('synqplay_session_id', sessionId);
    else sessionStorage.removeItem('synqplay_session_id');
  }, [sessionId]);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // --- WEBSOCKET SYNC EMITTER ---
  const syncStateToSocket = (updates) => {
    if (!sessionId || !userProfile || !socketRef.current) return;
    
    // Optimistically update our local UI so buttons feel instant
    if (updates.isPlaying !== undefined) {
        setIsPlaying(updates.isPlaying);
        setRoomIsPlaying(updates.isPlaying);
    }
    if (updates.progress !== undefined) setProgress(updates.progress);
    
    socketRef.current.emit('update-state', {
      sessionId,
      userId: userProfile.id || userProfile.email,
      updates
    });
  };

  const leaveParty = () => {
    if (sessionId && socketRef.current) {
      socketRef.current.emit('leave-session', { 
        sessionId, 
        userId: userProfile.id || userProfile.email 
      });
      socketRef.current.disconnect();
    }
    setSessionId(null);
  };

  const handleGlobalLogout = () => {
    leaveParty();
    onLogout();
  };

  // --- WEBSOCKET CONNECTION & LISTENER ---
  useEffect(() => {
    if (!sessionId || !userProfile) return;
    
    // CONNECT TO THE DEDICATED SOCKET SERVER URL
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;
    setSocketStatus('connecting');

    // Track Socket.io health state
    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('connect_error', () => setSocketStatus('error'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));

    socket.emit('join-session', { sessionId, userProfile });

    socket.on('session-update', (data) => {
      const myId = userProfile.id || userProfile.email;

      if (data.isPlaying !== undefined) setRoomIsPlaying(data.isPlaying);

      if (data.members) setPartyMembers(data.members);
      if (data.hostId) setHostId(data.hostId);

      // Prevent jumping if we were the ones who sent the update
      if (data.updatedBy === myId) return;

      if (data.queue) setQueue(data.queue);
      if (typeof data.queueIndex === 'number') setQueueIndex(data.queueIndex);

      let isNewTrack = false;
      if (data.currentTrack) {
        setCurrentTrack(prev => {
          if (!prev || prev.id !== data.currentTrack.id) {
             isNewTrack = true;
             if (player && typeof player.loadVideoById === 'function') {
                 player.loadVideoById(data.currentTrack.id);
             }
             return data.currentTrack;
          }
          return prev;
        });
      }

      if (player && typeof player.getPlayerState === 'function') {
         const state = player.getPlayerState();
         
         if (data.isPlaying && state !== window.YT.PlayerState.PLAYING && state !== window.YT.PlayerState.BUFFERING) {
             player.playVideo();
         } else if (!data.isPlaying && state === window.YT.PlayerState.PLAYING) {
             player.pauseVideo();
         }

         if (isNewTrack) {
             player.seekTo(data.progress || 0, true);
             setProgress(data.progress || 0);
         } else {
             const timeDiff = data.timestamp ? (Date.now() - data.timestamp) / 1000 : 0;
             const expectedProgress = data.isPlaying ? (data.progress + timeDiff) : data.progress;
             const localProgress = player.getCurrentTime() || 0;

             if (Math.abs(localProgress - expectedProgress) > 0.2) {
                 player.seekTo(expectedProgress, true);
                 setProgress(expectedProgress);
             }
         }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, player, userProfile]);

  // ... (Rest of the component remains exactly the same)
  
  useEffect(() => {
    const scriptId = 'yt-iframe-api';
    if (!window.YT && !document.getElementById(scriptId)) {
      const tag = document.createElement('script');
      tag.id = scriptId;
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag) firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      else document.body.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => {
      const ytPlayer = new window.YT.Player('synq-player', {
        height: '0', width: '0', videoId: '',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0 },
        events: {
          onReady: (e) => {
            setPlayer(e.target);
            setIsReady(true);
            setLocalPlayerState(e.target.getPlayerState());
            e.target.setVolume(100);
            if (currentTrackRef.current) e.target.loadVideoById(currentTrackRef.current.id);
          },
          onStateChange: (e) => {
            setLocalPlayerState(e.data);
            if (e.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setDuration(e.target.getDuration());
            } else if (e.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (e.data === window.YT.PlayerState.ENDED) {
              if (handleNextAutoplayRef.current) handleNextAutoplayRef.current(); 
            }
          }
        }
      });
    };
    return () => { window.onYouTubeIframeAPIReady = null; };
  }, []);

  const handleNextAutoplay = useCallback(() => {
    if (repeat === 2) {
      if (player) { player.seekTo(0); player.playVideo(); }
      if (sessionId) syncStateToSocket({ progress: 0 });
      return;
    }
    let nextIndex = queueIndex + 1;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeat === 1) nextIndex = 0;
      else return; 
    }
    if (queue[nextIndex]) {
      setQueueIndex(nextIndex);
      setCurrentTrack(queue[nextIndex]);
      if (player) player.loadVideoById(queue[nextIndex].id);
      if (sessionId) syncStateToSocket({ currentTrack: queue[nextIndex], queueIndex: nextIndex, progress: 0, isPlaying: true });
    }
  }, [queue, queueIndex, shuffle, repeat, player, sessionId]);

  useEffect(() => { handleNextAutoplayRef.current = handleNextAutoplay; }, [handleNextAutoplay]);

  useEffect(() => {
    let interval;
    if (isPlaying && player && typeof player.getCurrentTime === 'function') {
      interval = setInterval(() => setProgress(player.getCurrentTime()), 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, player]);

  const fetchLibraryData = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const likedRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=50`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const likedData = await likedRes.json();
      const playlistsRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const playlistsData = await playlistsRes.json();
      if (!likedData.error) setMyLikedSongs(likedData.items.map(formatYTItem));
      if (!playlistsData.error) setMyPlaylists(playlistsData.items);
    } catch (err) { console.error(err); } finally { setLoadingLibrary(false); }
  }, [accessToken]);

  useEffect(() => { fetchLibraryData(); }, [fetchLibraryData]);

  const toggleLike = async (track) => {
    const isLiked = myLikedSongs.some(t => t.id === track.id);
    if (isLiked) setMyLikedSongs(prev => prev.filter(t => t.id !== track.id));
    else setMyLikedSongs(prev => [track, ...prev]);
    try {
      await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${track.id}&rating=${isLiked ? 'none' : 'like'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch (err) { fetchLibraryData(); }
  };

  const playTrack = (track, contextQueue = null, index = -1) => {
    if (!isReady || !player) return;
    setCurrentTrack(track);
    player.loadVideoById(track.id);
    let newQueue = queue;
    let newQueueIndex = queueIndex;
    if (contextQueue) {
      newQueue = contextQueue;
      newQueueIndex = index !== -1 ? index : contextQueue.findIndex(t => t.id === track.id);
      setQueue(newQueue);
      setQueueIndex(newQueueIndex !== -1 ? newQueueIndex : 0);
    }
    if (sessionId) syncStateToSocket({ currentTrack: track, queue: newQueue, queueIndex: newQueueIndex !== -1 ? newQueueIndex : 0, isPlaying: true, progress: 0 });
  };

  const addToQueue = (track) => {
    const newQueue = [...queue, track];
    setQueue(newQueue);
    if (sessionId) syncStateToSocket({ queue: newQueue });
  };

  const removeFromQueue = (index) => {
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    let newQueueIndex = queueIndex;
    if (index < queueIndex) newQueueIndex -= 1;
    setQueueIndex(newQueueIndex);
    if (sessionId) syncStateToSocket({ queue: newQueue, queueIndex: newQueueIndex });
  };

  const playPlaylist = async (playlistId) => {
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!data.error && data.items.length > 0) {
        const tracks = data.items.map(item => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          artist: item.snippet.videoOwnerChannelTitle || "Unknown Artist",
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
        })).filter(t => t.title !== "Private video" && t.title !== "Deleted video");
        if (tracks.length > 0) playTrack(tracks[0], tracks, 0);
      }
    } catch (err) { console.error(err); }
  };

  const togglePlay = () => {
    if (!player || !currentTrack) return;
    const newIsPlaying = !isPlaying;
    if (newIsPlaying) player.playVideo();
    else player.pauseVideo();
    
    // Use the socket emitter instead of fetch
    if (sessionId) syncStateToSocket({ isPlaying: newIsPlaying, progress: player.getCurrentTime() || 0 });
  };

  const handlePrev = () => {
    if (progress > 3) {
      if (player) { player.seekTo(0); player.playVideo(); }
      if (sessionId) syncStateToSocket({ progress: 0 });
    } else if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      playTrack(queue[prevIndex], queue, prevIndex);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (player) player.seekTo(newTime, true);
    if (sessionId) syncStateToSocket({ progress: newTime, isPlaying: true });
  };

  const handleVolume = (e) => {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    if (player) {
      player.setVolume(newVol);
      if (newVol > 0 && isMuted) { setIsMuted(false); player.unMute(); }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#030303] text-white font-sans overflow-hidden select-none">
      <div id="synq-player" className="hidden"></div>
      
      <TopNav 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        userProfile={userProfile} onLogout={handleGlobalLogout}
        onOpenParty={() => setShowPartyModal(true)}
        sessionId={sessionId} partyMembers={partyMembers}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          playlists={myPlaylists} 
          playPlaylist={playPlaylist} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />

        <main className="flex-1 overflow-y-auto bg-[#0a0f1a] relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto">
            {activeTab === 'home' && <HomeView accessToken={accessToken} onPlay={playTrack} likedSongs={myLikedSongs} userProfile={userProfile} addToQueue={addToQueue} />}
            {activeTab === 'explore' && <ExploreView accessToken={accessToken} onPlay={playTrack} addToQueue={addToQueue} />}
            {activeTab === 'library' && (
              <LibraryView 
                likedSongs={myLikedSongs} playlists={myPlaylists}
                onPlay={playTrack} playPlaylist={playPlaylist} addToQueue={addToQueue}
                currentTrack={currentTrack} loading={loadingLibrary}
              />
            )}
            {activeTab === 'search' && (
              <SearchView 
                accessToken={accessToken} query={searchQuery} 
                onPlay={playTrack} likedSongs={myLikedSongs} toggleLike={toggleLike} addToQueue={addToQueue}
              />
            )}
          </div>
        </main>

        {/* Sync Prompt Overlay for Autoplay Blocked on Refresh/Join */}
        {roomIsPlaying && localPlayerState !== 1 && localPlayerState !== 3 && localPlayerState !== -10 && (
          <div 
            className="absolute top-24 left-1/2 -translate-x-1/2 z-[80] bg-blue-600/95 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.5)] flex items-center gap-3 animate-in slide-in-from-top-4 cursor-pointer border border-blue-400 hover:scale-105 transition-transform" 
            onClick={() => { 
                if (player) {
                    player.playVideo();
                    setLocalPlayerState(3); // Buffering visual state immediately
                }
            }}
          >
              <div className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </div>
              <span className="font-bold text-sm tracking-wide">Tap to Sync Audio</span>
          </div>
        )}

        {showQueue && (
          <>
            {/* Mobile Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] xl:hidden transition-opacity" 
              onClick={() => setShowQueue(false)} 
            />
            
            {/* Sidebar container */}
            <div className="fixed inset-y-0 right-0 w-[85%] max-w-[360px] bg-[#0a0f1a] border-l border-white/5 flex flex-col z-[100] xl:static xl:w-80 xl:z-40 shadow-[0_0_50px_rgba(0,0,0,0.8)] xl:shadow-[-10px_0_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-right xl:animate-none duration-300">
              <div className="p-4 pt-6 md:pt-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0a0f1a] sticky top-0 z-10">
                <h3 className="font-bold text-lg text-white">Up Next</h3>
                <button onClick={() => setShowQueue(false)} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full xl:bg-transparent xl:p-0 xl:mr-0">
                  <X className="w-5 h-5 xl:w-6 xl:h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 pb-24 xl:pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {queue.map((track, idx) => (
                  <ListTrackRow 
                    key={`${track.id}-${idx}`} 
                    track={track} 
                    index={idx === queueIndex ? undefined : idx + 1}
                    isActive={idx === queueIndex}
                    context={queue} 
                    onPlay={() => playTrack(track, queue, idx)}
                    action={
                      <button onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-full text-gray-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <PlayerBar 
        currentTrack={currentTrack} isPlaying={isPlaying}
        progress={progress} duration={duration}
        volume={volume} isMuted={isMuted}
        onTogglePlay={togglePlay} onNext={handleNextAutoplay} onPrev={handlePrev}
        onSeek={handleSeek} onVolume={handleVolume}
        likedSongs={myLikedSongs} toggleLike={toggleLike}
        showQueue={showQueue} setShowQueue={setShowQueue}
        shuffle={shuffle} setShuffle={setShuffle}
        repeat={repeat} setRepeat={setRepeat}
      />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {showPartyModal && (
        <PartyModal 
          onClose={() => setShowPartyModal(false)}
          sessionId={sessionId} onLeave={leaveParty}
          setSessionId={setSessionId}
          userProfile={userProfile} partyMembers={partyMembers} hostId={hostId}
          currentTrack={currentTrack} queue={queue} queueIndex={queueIndex}
          isPlaying={isPlaying} progress={progress}
          socketStatus={socketStatus}
        />
      )}
    </div>
  );
}

function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'library', icon: Library, label: 'Library' },
  ];

  return (
    <nav className="flex lg:hidden items-center justify-around h-14 bg-[#212121] border-t border-white/5 z-50 fixed bottom-0 left-0 right-0 px-2 pb-safe">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center justify-center flex-1 space-y-1 transition-colors ${activeTab === tab.id ? 'text-white font-bold' : 'text-gray-400'}`}
        >
          <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'fill-current' : ''}`} />
          <span className="text-[10px] tracking-wide">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

function PartyModal({ onClose, sessionId, onLeave, setSessionId, userProfile, partyMembers, hostId, currentTrack, queue, queueIndex, isPlaying, progress, socketStatus }) {
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState('');
  const userId = userProfile.id || userProfile.email;

  const createParty = () => {
    if (!userProfile) return setError("User profile missing.");
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // We instantly set the sessionId, which triggers the useEffect connecting the socket
    setSessionId(newId);
  };

  const joinParty = () => {
    if (!joinId.trim()) return;
    const cleanId = joinId.trim().toUpperCase();
    setSessionId(cleanId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-[#121212] border border-blue-500/20 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-blue-600/20 rounded-full flex items-center justify-center mb-4"><Users className="w-7 h-7 text-blue-400" /></div>
          <h2 className="text-2xl font-bold text-white text-center">Listen Together</h2>
          <p className="text-xs text-gray-400 text-center mt-2 leading-relaxed px-4">Instant WebSocket syncing across multiple devices.</p>
          
          {/* Live Socket Status Indicator */}
          {sessionId && (
            <div className="flex items-center justify-center space-x-2 mt-4 bg-[#0a0f1a] px-4 py-1.5 rounded-full border border-white/5">
              <div className={`w-2 h-2 rounded-full ${socketStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : socketStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
                {socketStatus === 'connected' ? 'Server Connected' : socketStatus === 'connecting' ? 'Connecting...' : 'Server Offline'}
              </span>
            </div>
          )}
        </div>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4 text-center">{error}</div>}
        
        {/* Socket Server Offline Warning */}
        {sessionId && socketStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4 text-center flex flex-col gap-1">
            <span className="font-bold flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3"/> Connection Failed</span>
            <span>Check if your standalone server at <code className="bg-black/30 px-1 py-0.5 rounded">{SOCKET_URL || 'localhost'}</code> is running.</span>
          </div>
        )}

        {sessionId ? (
          <div className="space-y-6">
            <div className="bg-[#0a0f1a] p-5 rounded-xl border border-blue-500/30 text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Your Party Code</p>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-3xl font-black text-white tracking-widest">{sessionId}</span>
                <button onClick={() => navigator.clipboard.writeText(sessionId)} className="p-1.5 text-blue-400 hover:bg-white/5 rounded-md transition-colors"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3 text-xs flex items-center justify-between">Party Members <span className="bg-blue-600 px-2 py-0.5 rounded-full text-[10px]">{partyMembers.length}</span></h3>
              <div className="flex flex-col space-y-2 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                 {partyMembers.map(m => (
                    <div key={m.id} className="flex items-center space-x-3 bg-white/5 p-2 rounded-lg">
                       <img src={m.picture} className="w-7 h-7 rounded-full" />
                       <span className="text-xs text-white font-medium truncate flex-1">{m.name} {m.id === userId && "(You)"}</span>
                       {m.id === hostId && <span className="text-[8px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">HOST</span>}
                    </div>
                 ))}
              </div>
            </div>
            <button onClick={() => { onLeave(); onClose(); }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-bold transition-colors">Leave Party</button>
          </div>
        ) : (
          <div className="space-y-6">
            <button onClick={createParty} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-600/20">Start New Party</button>
            <div className="flex items-center space-x-4 my-2 text-gray-600"><div className="flex-1 h-px bg-white/5" /><span className="text-[10px] font-bold uppercase">OR</span><div className="flex-1 h-px bg-white/5" /></div>
            <div className="flex space-x-2">
              <input type="text" value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="Code" className="flex-1 bg-[#0a0f1a] border border-white/10 rounded-lg px-4 text-center font-bold tracking-widest uppercase focus:border-blue-500 outline-none" maxLength={6} />
              <button onClick={joinParty} className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors">Join</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TopNav({ activeTab, setActiveTab, searchQuery, setSearchQuery, userProfile, onLogout, onOpenParty, sessionId, partyMembers, onOpenSidebar }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const handleSearchSubmit = (e) => { e.preventDefault(); if (searchQuery.trim()) setActiveTab('search'); };

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 bg-[#030303] shrink-0 z-50 sticky top-0 border-b border-white/5">
      <div className="flex items-center space-x-3 md:space-x-4 shrink-0 lg:w-[240px]">
        <button onClick={onOpenSidebar} className="p-1 hover:bg-white/5 rounded-full lg:hidden">
          <Menu className="w-6 h-6 text-white opacity-80" />
        </button>
        <button onClick={() => setShowProfileMenu(false)} className="lg:p-1 hover:bg-white/5 rounded-full hidden lg:block">
           <MoreVertical className="w-6 h-6 text-white opacity-80" />
        </button>
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <SynQplayLogo className="w-7 h-7 md:w-8 md:h-8" />
          <span className="text-lg md:text-xl font-black tracking-tight hidden sm:block text-white">SynQplay</span>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-2 md:mx-4">
        <form onSubmit={handleSearchSubmit} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400 group-focus-within:text-white" />
          </div>
          <input
            type="text"
            className="w-full bg-[#121212] border border-white/5 text-white rounded-full text-sm py-1.5 md:py-2.5 pl-9 md:pl-12 pr-4 focus:outline-none focus:bg-[#181818] placeholder-gray-500 transition-all"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="flex items-center justify-end space-x-2 md:space-x-5 shrink-0 lg:w-[240px]">
        {sessionId && partyMembers && (
           <div className="hidden sm:flex items-center -space-x-2 cursor-pointer" onClick={onOpenParty}>
             {partyMembers.slice(0, 2).map(m => (
               <img key={m.id} src={m.picture} className="w-7 h-7 rounded-full border-2 border-[#030303]" title={m.name} />
             ))}
           </div>
        )}
        <button onClick={onOpenParty} className={`p-1.5 rounded-full transition-colors ${sessionId ? 'text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}>
          <Users className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="focus:outline-none shrink-0">
          <img src={userProfile?.picture} className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-transparent hover:border-white/50 transition-all" />
        </button>
        {showProfileMenu && (
          <div className="absolute top-12 right-0 w-64 bg-[#121212] border border-white/5 rounded-xl shadow-2xl overflow-hidden py-2 z-[100] text-sm">
            <div className="px-4 py-3 flex items-start space-x-3 mb-2">
              <img src={userProfile?.picture} alt="" className="w-9 h-9 rounded-full mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate text-xs">{userProfile?.name}</p>
                <p className="text-gray-500 truncate text-[10px]">{userProfile?.email}</p>
              </div>
            </div>
            <div className="border-t border-white/10 my-1"></div>
            <button onClick={() => { onLogout(); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-gray-300 hover:bg-white/5 flex items-center space-x-3 transition-colors">
              <LogOut className="w-4 h-4" /><span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function Sidebar({ activeTab, setActiveTab, playlists, playPlaylist, isOpen, onClose }) {
  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'library', icon: Library, label: 'Library' },
  ];

  const content = (
    <>
      <nav className="w-full py-3 space-y-1">
        {sidebarItems.map(item => (
          <button 
            key={item.id}
            onClick={() => { setActiveTab(item.id); onClose(); }} 
            className={`w-full flex items-center space-x-4 px-6 py-2.5 transition-colors ${activeTab === item.id ? 'bg-[#1a1a1a] text-white font-bold' : 'text-gray-300 hover:bg-[#1a1a1a]'}`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-current' : ''}`} />
            <span className="text-[15px]">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="border-t border-white/10 my-2 mx-6"></div>
      <div className="px-6 py-3">
        <button className="flex items-center space-x-2 bg-[#121212] hover:bg-[#222] text-white px-4 py-2 rounded-full text-[14px] font-medium transition-colors border border-white/5 w-full">
          <Plus className="w-5 h-5" /><span>New playlist</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 [&::-webkit-scrollbar]:hidden">
        <button onClick={() => { setActiveTab('library'); onClose(); }} className={`w-full flex flex-col text-left px-3 py-2 rounded-lg transition-colors ${activeTab === 'library' ? 'bg-[#1a1a1a]' : 'hover:bg-[#1a1a1a]'}`}>
          <span className={`text-[14px] truncate ${activeTab === 'library' ? 'text-white font-bold' : 'text-gray-200'}`}>Liked Music</span>
          <span className="text-[10px] text-gray-500 flex items-center mt-0.5"><Heart className="w-3 h-3 mr-1 fill-current" /> Auto playlist</span>
        </button>
        {playlists.map(playlist => (
          <button key={playlist.id} onClick={() => { playPlaylist(playlist.id); onClose(); }} className="w-full flex flex-col text-left px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors">
            <span className="text-[14px] text-gray-200 truncate group-hover:text-white leading-tight">{playlist.snippet.title}</span>
            <span className="text-[10px] text-gray-500 truncate mt-0.5">{playlist.snippet.channelTitle}</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-[60] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />
      <aside className={`fixed lg:static inset-y-0 left-0 w-[240px] bg-[#030303] flex flex-col z-[70] transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shrink-0 border-r border-white/5`}>
        <div className="flex items-center p-4 lg:hidden">
           <SynQplayLogo className="w-7 h-7 mr-2" /><span className="font-black text-white">SynQplay</span>
           <button onClick={onClose} className="ml-auto p-1"><X className="w-6 h-6 text-gray-400" /></button>
        </div>
        {content}
      </aside>
    </>
  );
}

function PlayerBar({ 
  currentTrack, isPlaying, progress, duration, volume, isMuted, 
  onTogglePlay, onNext, onPrev, onSeek, onVolume, likedSongs, toggleLike,
  showQueue, setShowQueue, shuffle, setShuffle, repeat, setRepeat
}) {
  const isLiked = currentTrack && likedSongs.some(t => t.id === currentTrack.id);
  const getRepeatIcon = () => {
    if (repeat === 2) return <Repeat className="w-5 h-5 text-white" />; 
    if (repeat === 1) return <Repeat className="w-5 h-5 text-white" />;
    return <Repeat className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="h-[72px] bg-[#212121] flex items-center px-3 md:px-6 z-50 relative shrink-0 mb-14 lg:mb-0">
      <div className="absolute top-0 left-0 right-0 h-1 group cursor-pointer -mt-[2px]">
        <input type="range" min="0" max={duration || 100} value={progress} onChange={onSeek} className="w-full h-full absolute inset-0 opacity-0 cursor-pointer z-10" />
        <div className="w-full h-[2px] bg-white/10 absolute bottom-0 group-hover:h-1 transition-all">
          <div className="h-full bg-red-600" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="flex items-center w-auto lg:w-1/4 shrink-0 mr-4 md:mr-0">
        <div className="flex items-center space-x-3 sm:space-x-5">
          <button onClick={onPrev} className="text-white hover:text-gray-300 transition-colors">
            <SkipBack className="w-6 h-6 fill-current" />
          </button>
          <button onClick={onTogglePlay} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-white rounded-full hover:bg-white/10 transition-colors">
            {isPlaying ? <Pause className="w-7 h-7 md:w-8 md:h-8 fill-current" /> : <Play className="w-7 h-7 md:w-8 md:h-8 fill-current ml-1" />}
          </button>
          <button onClick={onNext} className="text-white hover:text-gray-300 transition-colors">
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
          <span className="text-[11px] text-gray-400 font-medium tracking-wide hidden lg:block min-w-[75px]">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-start lg:justify-center flex-1 min-w-0 pr-4">
        {currentTrack && (
          <div className="flex items-center space-x-3 md:space-x-4 max-w-full">
             <img src={currentTrack.thumbnail} alt="" className="w-9 h-9 md:w-10 md:h-10 object-cover rounded shrink-0 shadow-lg" />
             <div className="flex flex-col min-w-0">
                <span className="text-[13px] md:text-[15px] font-bold text-white truncate leading-tight">{currentTrack.title}</span>
                <span className="text-[11px] md:text-[13px] text-gray-500 truncate mt-0.5">{currentTrack.artist}</span>
             </div>
             <button onClick={() => toggleLike(currentTrack)} className="p-2 hover:bg-white/10 rounded-full transition-all shrink-0 hidden sm:block">
               <Heart className={`w-5 h-5 ${isLiked ? 'fill-white text-white' : 'text-gray-500'}`} />
             </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end w-auto lg:w-1/4 space-x-2 md:space-x-4 shrink-0">
        <button onClick={() => onVolume({ target: { value: isMuted ? 100 : 0 } })} className="text-gray-400 hover:text-white hidden lg:block">
          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={onVolume} className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hidden lg:block" />
        <div className="flex items-center space-x-1 sm:space-x-3 lg:border-l lg:border-white/10 lg:pl-4">
          <button onClick={() => setRepeat((repeat + 1) % 3)} className="p-2 hover:bg-white/10 rounded-full relative transition-colors hidden md:block">
            {getRepeatIcon()}
            {repeat === 2 && <span className="absolute text-[9px] font-bold text-[#212121] bg-white rounded-full w-[14px] h-[14px] flex items-center justify-center top-0 right-0">1</span>}
          </button>
          <button onClick={() => setShuffle(!shuffle)} className="p-2 hover:bg-white/10 rounded-full transition-colors hidden md:block">
            <Shuffle className={`w-5 h-5 ${shuffle ? 'text-white' : 'text-gray-500'}`} />
          </button>
          <button onClick={() => setShowQueue(!showQueue)} className={`p-2 rounded-full transition-colors ${showQueue ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
             <ListVideo className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeView({ accessToken, onPlay, likedSongs, userProfile, addToQueue }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const sectionsData = [];
        const queries = [{ title: "Forgotten favorites", q: "classic hits playlist official" }, { title: "Trending Music Videos", q: "top official music video 2024" }];
        for (const category of queries) {
          const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(category.q)}&type=video&videoCategoryId=10&maxResults=8`, { headers: { Authorization: `Bearer ${accessToken}` } });
          const data = await res.json();
          if (!data.error) sectionsData.push({ title: category.title, tracks: data.items.map(formatYTItem) });
        }
        setSections(sectionsData);
      } catch (err) {} finally { setLoading(false); }
    };
    fetchHomeData();
  }, [accessToken]);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center space-x-2 md:space-x-3 overflow-x-auto pb-4 sticky top-0 bg-[#0a0f1a]/95 backdrop-blur-md z-30 pt-2 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map(cat => (
          <button key={cat} className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-4 py-1.5 rounded-lg text-[13px] md:text-[14px] font-medium whitespace-nowrap transition-colors border border-white/5">{cat}</button>
        ))}
      </div>

      <section>
        <div className="flex items-center space-x-3 mb-4">
           <img src={userProfile?.picture} className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-white/10" />
           <p className="text-[12px] md:text-[13px] text-gray-400 uppercase font-bold tracking-widest">{userProfile?.name?.split(' ')[0]}</p>
        </div>
        <h2 className="text-3xl md:text-[40px] font-black mb-6 text-white tracking-tight leading-none">Listen again</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
          {likedSongs.length > 0 && (
            <div onClick={() => onPlay(likedSongs[0], likedSongs)} className="group flex flex-col cursor-pointer">
              <div className="relative aspect-square w-full rounded-[4px] overflow-hidden mb-3 bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl">
                <ThumbsUp className="w-12 h-12 md:w-16 md:h-16 text-white fill-current opacity-90" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-12 h-12 bg-black/80 rounded-full flex items-center justify-center hover:scale-110 transition-transform"><Play className="w-6 h-6 text-white fill-current ml-1" /></div></div>
              </div>
              <h3 className="font-bold text-[14px] md:text-[15px] text-white truncate leading-tight">Liked Music</h3>
              <p className="text-[11px] md:text-[13px] text-gray-500 truncate mt-0.5">Auto playlist</p>
            </div>
          )}
          {likedSongs.slice(0, 5).map(track => <TrackCard key={track.id} track={track} context={likedSongs} onPlay={onPlay} />)}
        </div>
      </section>

      {!loading && sections.map((section, idx) => (
        <section key={idx}>
          <h2 className="text-2xl md:text-3xl font-black mb-6 text-white tracking-tight">{section.title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
            {section.tracks.map((track) => <TrackCard key={track.id} track={track} context={section.tracks} onPlay={onPlay} />)}
          </div>
        </section>
      ))}
      {loading && <LoadingScreen />}
    </div>
  );
}

function ExploreView({ accessToken, onPlay, addToQueue }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&maxResults=20`, { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        if (!data.error) setTrending(data.items.map(formatYTItem));
      } catch (err) {} finally { setLoading(false); }
    };
    fetchTrending();
  }, [accessToken]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl">
      <h2 className="text-3xl md:text-[40px] font-black mb-8 text-white tracking-tight leading-none">Trending Music</h2>
      <div className="space-y-1">
        {trending.map((track, idx) => <ListTrackRow key={track.id} track={track} index={idx + 1} context={trending} onPlay={onPlay} action={<button onClick={(e) => { e.stopPropagation(); addToQueue(track); }} className="p-2 text-gray-500 hover:text-white transition-colors"><Plus className="w-5 h-5" /></button>} />)}
      </div>
    </div>
  );
}

function SearchView({ accessToken, query, onPlay, likedSongs, toggleLike, addToQueue }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const doSearch = async () => {
      if (!query.trim()) { setResults([]); setHasSearched(false); return; }
      setLoading(true); setHasSearched(true);
      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20`, { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        if (!data.error) setResults(data.items.map(formatYTItem));
      } catch (err) {} finally { setLoading(false); }
    };
    const debounceTimer = setTimeout(doSearch, 800);
    return () => clearTimeout(debounceTimer);
  }, [query, accessToken]);

  if (!hasSearched) return <div className="flex flex-col items-center justify-center h-64 text-gray-500"><Search className="w-12 h-12 mb-4 opacity-10" /><p className="text-sm">Enter a search term above</p></div>;
  if (loading) return <LoadingScreen />;

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-black mb-6 text-white tracking-tight">Results for "{query}"</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {results.map((track) => (
          <ListTrackRow 
            key={track.id} track={track} context={results} onPlay={onPlay} 
            action={
              <div className="flex items-center">
                <button onClick={(e) => { e.stopPropagation(); addToQueue(track); }} className="p-2 text-gray-500 hover:text-white transition-colors"><Plus className="w-5 h-5" /></button>
                <button onClick={(e) => { e.stopPropagation(); toggleLike(track); }} className="p-2 text-gray-500 hover:text-white transition-colors"><Heart className={`w-5 h-5 ${likedSongs.some(t => t.id === track.id) ? 'fill-white text-white' : ''}`} /></button>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

function LibraryView({ likedSongs, playlists, onPlay, playPlaylist, currentTrack, loading, addToQueue }) {
  if (loading) return <LoadingScreen />;
  return (
    <div className="animate-in fade-in duration-500 max-w-6xl">
      <h2 className="text-3xl md:text-[40px] font-black text-white mb-8 tracking-tight">Your Library</h2>
      <h3 className="text-xl md:text-2xl font-bold text-white mb-6 tracking-tight">Playlists</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 mb-12">
        <div onClick={() => likedSongs.length > 0 && onPlay(likedSongs[0], likedSongs)} className="group flex flex-col cursor-pointer">
          <div className="relative aspect-square w-full rounded-[4px] overflow-hidden mb-3 bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg"><ThumbsUp className="w-12 h-12 md:w-16 md:h-16 text-white fill-current opacity-90" /></div>
          <h3 className="font-bold text-[14px] md:text-[15px] text-white truncate leading-tight">Liked Songs</h3>
          <p className="text-[11px] md:text-[13px] text-gray-500 mt-0.5">{likedSongs.length} songs</p>
        </div>
        {playlists.map(playlist => (
          <div key={playlist.id} onClick={() => playPlaylist(playlist.id)} className="group flex flex-col cursor-pointer">
            <div className="relative aspect-square w-full rounded-[4px] overflow-hidden mb-3 bg-[#1a1a1a] border border-white/5">
              {playlist.snippet.thumbnails?.high?.url ? <img src={playlist.snippet.thumbnails.high.url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]"><ListMusic className="w-10 h-10 text-gray-600" /></div>}
            </div>
            <h3 className="font-bold text-[14px] md:text-[15px] text-white truncate leading-tight">{playlist.snippet.title}</h3>
            <p className="text-[11px] md:text-[13px] text-gray-500 mt-0.5">{playlist.snippet.channelTitle}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-3 mb-6"><Heart className="w-6 h-6 text-blue-500 fill-current" /><h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">Liked Videos</h3></div>
      <div className="space-y-1">
        {likedSongs.length === 0 ? <p className="text-gray-500 text-sm py-4">No liked music found.</p> : likedSongs.slice(0, 50).map((track, idx) => <ListTrackRow key={`${track.id}-${idx}`} track={track} index={idx + 1} context={likedSongs} onPlay={onPlay} isActive={currentTrack?.id === track.id} action={<button onClick={(e) => { e.stopPropagation(); addToQueue(track); }} className="p-2 text-gray-500 hover:text-white transition-colors"><Plus className="w-5 h-5" /></button>} />)}
      </div>
    </div>
  );
}

function TrackCard({ track, context, onPlay }) {
  return (
    <div className="group flex flex-col cursor-pointer transition-all active:scale-[0.98]" onClick={() => onPlay(track, context)}>
      <div className="relative aspect-square w-full rounded-[4px] overflow-hidden mb-3 bg-[#1a1a1a] shadow-sm">
        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-10 h-10 md:w-12 md:h-12 bg-black/80 rounded-full flex items-center justify-center"><Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-current ml-1" /></div></div>
      </div>
      <h3 className="font-bold text-[13px] md:text-[15px] text-white line-clamp-2 mt-1 leading-tight group-hover:text-gray-200 transition-colors">{track.title}</h3>
      <p className="text-[11px] md:text-[13px] text-gray-500 mt-1 truncate">{track.artist}</p>
    </div>
  );
}

function ListTrackRow({ track, index, context, onPlay, isActive, action }) {
  return (
    <div className={`group flex items-center p-2 rounded-lg transition-colors cursor-pointer border border-transparent ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={() => onPlay(track, context)}>
      {index !== undefined && <div className="w-8 text-center text-[12px] md:text-[14px] font-medium text-gray-400 relative shrink-0"><span className="group-hover:hidden">{isActive ? <Volume2 className="w-4 h-4 mx-auto text-white" /> : index}</span><Play className="w-4 h-4 fill-current text-white mx-auto hidden group-hover:block" /></div>}
      <div className="relative w-9 h-9 md:w-10 md:h-10 overflow-hidden rounded-[4px] shrink-0 ml-1 mr-3 md:mr-4 bg-[#1a1a1a] shadow-sm"><img src={track.thumbnail} alt="" className="w-full h-full object-cover" />{index === undefined && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center"><Play className="w-5 h-5 text-white fill-current" /></div>}</div>
      <div className="flex-1 min-w-0 pr-2 md:pr-4"><p className={`text-[14px] md:text-[15px] font-bold truncate leading-tight ${isActive ? 'text-white' : 'text-gray-100'}`}>{track.title}</p><p className="text-[11px] md:text-[13px] text-gray-500 truncate mt-0.5">{track.artist}</p></div>
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1 shrink-0">{action || <button className="p-2 text-gray-500 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}><MoreVertical className="w-5 h-5" /></button>}</div>
    </div>
  );
}

function LoadingScreen() { return <div className="flex flex-col items-center justify-center h-64 text-gray-600"><Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" /><p className="text-xs font-bold uppercase tracking-widest">Loading</p></div>; }
function formatYTItem(item) { const id = typeof item.id === 'object' ? item.id.videoId : item.id; const parser = new DOMParser(); const decodeString = (str) => { const dom = parser.parseFromString(`<!doctype html><body>${str}`, 'text/html'); return dom.body.textContent; }; return { id, title: decodeString(item.snippet.title), artist: decodeString(item.snippet.channelTitle), thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url }; }
function formatTime(seconds) { if (isNaN(seconds) || seconds === 0) return "0:00"; const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${s.toString().padStart(2, '0')}`; }
