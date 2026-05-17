/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Users, MapPin, Play, LogOut, ChevronRight, AlertCircle, Search, Info, Trash2, Pause, PlayCircle, Trophy, Languages, Volume2, VolumeX, SkipForward, RefreshCw, ChevronUp, ChevronDown, Settings2 } from 'lucide-react';
import { GameState, Player, UserSummary } from './types.ts';
import { translations } from './translations.ts';

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<UserSummary[]>([]);
  const [language, setLanguage] = useState<'en' | 'fa'>(() => (localStorage.getItem('lang') as 'en' | 'fa') || 'en');
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'error' | 'success' | 'info' }[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [hasPlayedReveal, setHasPlayedReveal] = useState(false);

  useEffect(() => {
    if (game?.status === 'result') {
      setHasPlayedReveal(true);
    } else {
      setHasPlayedReveal(false);
    }
  }, [game?.status]);

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);
  const socketRef = useRef<Socket | null>(null);

  const t = (path: string) => {
    const keys = path.split('.');
    let current: any = translations[language];
    for (const key of keys) {
      if (current[key] === undefined) return path;
      current = current[key];
    }
    return current;
  };

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('gameUpdated', (updatedGame: GameState) => {
      setGame(updatedGame);
      setIsJoined(true);
      setError(null);
    });

    socketRef.current.on('leaderboardUpdated', (data: UserSummary[]) => {
      setLeaderboard(data);
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      addToast(t('errors.disconnected'), 'error');
    });

    socketRef.current.on('error_code', (code: string) => {
      const message = t(`errors.${code}`);
      addToast(message === `errors.${code}` ? code : message, 'error');
    });

    socketRef.current.on('error', (msg: string) => {
      addToast(msg, 'error');
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const createGame = () => {
    if (!playerName.trim()) return addToast(t('errors.name_required'));
    socketRef.current?.emit('createGame', playerName);
  };

  const joinGame = () => {
    if (!playerName.trim()) return addToast(t('errors.name_required'));
    if (!gameCode.trim()) return addToast(t('errors.code_required'));
    if (gameCode.length < 3) return addToast(t('errors.invalid_code'));
    socketRef.current?.emit('joinGame', { gameId: gameCode.toUpperCase(), playerName });
  };

  const startGame = () => {
    if (game) socketRef.current?.emit('startGame', game.id);
  };

  const startVoting = () => {
    if (game) socketRef.current?.emit('startVoting', game.id);
  };

  const castVote = (targetId: string) => {
    if (game) socketRef.current?.emit('castVote', { gameId: game.id, targetId });
  };

  const spyGuess = (location: string) => {
    if (game) socketRef.current?.emit('spyGuess', { gameId: game.id, location });
  };

  const resetGame = () => {
    if (game) socketRef.current?.emit('resetGame', game.id);
  };

  const kickPlayer = (playerId: string) => {
    if (game) socketRef.current?.emit('kickPlayer', { gameId: game.id, playerId });
  };

  const pauseGame = () => {
    if (game) socketRef.current?.emit('pauseGame', game.id);
  };

  const resumeGame = () => {
    if (game) socketRef.current?.emit('resumeGame', game.id);
  };

  const toggleMute = (playerId: string) => {
    if (game) socketRef.current?.emit('toggleMute', { gameId: game.id, playerId });
  };

  const skipTurn = () => {
    if (game) socketRef.current?.emit('skipTurn', game.id);
  };

  const reshuffleSpies = () => {
    if (game) {
      socketRef.current?.emit('reshuffleSpies', game.id);
      addToast(language === 'fa' ? 'نقش‌ها تغییر یافت!' : 'Roles Reshuffled!', 'success');
    }
  };

  const reorderPlayers = (startIndex: number, direction: 'up' | 'down') => {
    if (!game || !me?.isHost) return;
    const newPlayers = [...game.players];
    const targetIndex = direction === 'up' ? startIndex - 1 : startIndex + 1;
    if (targetIndex < 0 || targetIndex >= newPlayers.length) return;
    
    [newPlayers[startIndex], newPlayers[targetIndex]] = [newPlayers[targetIndex], newPlayers[startIndex]];
    socketRef.current?.emit('reorderPlayers', { gameId: game.id, players: newPlayers });
  };

  const fetchLeaderboard = () => {
    socketRef.current?.emit('getLeaderboard');
    setShowLeaderboard(true);
  };

  const leaveGame = () => {
    if (game) {
      socketRef.current?.emit('leaveGame', game.id);
      setGame(null);
      setIsJoined(false);
    }
  };

  const isSpy = game?.spyIds.includes(socketRef.current?.id || '');
  const me = game?.players.find(p => p.id === socketRef.current?.id);
  const myVote = game?.votes?.[socketRef.current?.id || ''];

  const updateSettings = (key: string, value: any) => {
    if (!game || !me?.isHost) return;
    const newSettings = { ...game.settings, [key]: value };
    socketRef.current?.emit('updateSettings', { gameId: game.id, settings: newSettings });
  };

  return (
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 selection:bg-orange-500/30 ${language === 'fa' ? 'font-vazir' : ''}`} dir={language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-center gap-3 min-w-[280px] max-w-sm ${
                toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                'bg-blue-500/10 border-blue-500/30 text-blue-500'
              }`}
            >
              <AlertCircle size={20} className="flex-shrink-0" />
              <p className="text-sm font-bold">{toast.message}</p>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-auto p-1 hover:bg-black/10 rounded-lg"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Global Connection Warning */}
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 z-[250] bg-red-600 text-white text-[10px] font-black uppercase py-1 text-center tracking-widest animate-pulse">
          {t('errors.disconnected')}
        </div>
      )}

      {!isJoined ? (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
          {/* Atmosphere Background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl"
          >
          {/* Lang Switcher */}
          <div className="absolute top-6 left-6">
             <button 
              onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-all shadow-inner"
             >
                <Languages size={14} className="text-orange-500" />
                {language === 'en' ? 'FA' : 'EN'}
             </button>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              <Ghost className="text-neutral-950 w-8 h-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2">{t('title')}</h1>
            <p className="text-neutral-400 text-sm text-center uppercase tracking-widest font-bold">{t('motto')}</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{t('enter_name')}</label>
              <input 
                type="text" 
                placeholder={t('enter_name') + "..."}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder:text-neutral-600"
              />
            </div>

                <div className="pt-4 border-t border-neutral-800 space-y-4">
                  <button 
                    onClick={createGame}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-neutral-950 font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2"
                  >
                    {t('create_operation')} <ChevronRight size={18} className={language === 'fa' ? 'rotate-180' : ''} />
                  </button>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-neutral-800"></div>
                    <span className="flex-shrink mx-4 text-xs font-bold text-neutral-600 uppercase tracking-widest">{language === 'fa' ? 'یا' : 'OR'}</span>
                    <div className="flex-grow border-t border-neutral-800"></div>
                  </div>

                  <button 
                    onClick={fetchLeaderboard}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-neutral-700 mt-2"
                  >
                    <Trophy size={18} className="text-orange-500" /> {t('hall_of_fame')}
                  </button>

                  <div className="relative flex items-center py-2">
                     <div className="flex-grow border-t border-dotted border-neutral-800"></div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">{t('enter_code')}</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="CODE"
                        value={gameCode}
                        onChange={(e) => setGameCode(e.target.value)}
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-neutral-600 uppercase"
                        maxLength={6}
                      />
                      <button 
                        onClick={joinGame}
                        className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-6 rounded-xl transition-all flex items-center justify-center font-bold"
                      >
                        {t('join_operation').split(' ')[0]}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <footer className="fixed bottom-6 left-0 right-0 text-center z-10">
              <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-[0.4em]">{language === 'fa' ? 'طراحی شده توسط تیم DeepInk' : 'Designed by DeepInk Team'}</p>
            </footer>
          </div>
        ) : (
          <>
            <nav className="border-bottom border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50 p-4">
              <div className="max-w-4xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Ghost className="text-neutral-950 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest leading-none mb-1">{game?.status === 'lobby' ? t('lobby.ready') : t('playing.mission_details')}</p>
                    <h2 className="text-xl font-bold tracking-tight text-white leading-none">
                      {game?.status === 'lobby' ? (language === 'fa' ? 'در انتظار ماموران' : 'In Lobby') : (language === 'fa' ? 'عملیات فعال' : 'In Progress')}
                    </h2>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
                    className="px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-all shadow-inner hidden sm:flex items-center gap-2"
                  >
                      <Languages size={14} className="text-orange-500" />
                      {language === 'en' ? 'FA' : 'EN'}
                  </button>
                  <button 
                    onClick={() => setShowModeInfo(true)}
                    className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-all text-blue-400"
                  >
                    <Info size={20} />
                  </button>
                  <div className={`hidden sm:flex flex-col ${language === 'fa' ? 'items-start' : 'items-end'}`}>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none mb-1">{t('enter_code')}</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(game?.id || '');
                        addToast(language === 'fa' ? 'کد کپی شد!' : 'Code copied!', 'success');
                      }}
                      className="text-lg font-mono font-bold text-orange-500 flex items-center gap-2 hover:text-orange-400 transition-colors group"
                    >
                      {game?.id}
                      <RefreshCw size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                  <button 
                    onClick={leaveGame}
                    className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-all text-neutral-400 hover:text-white"
                  >
                    <LogOut size={20} className={language === 'fa' ? 'rotate-180' : ''} />
                  </button>
                </div>
              </div>
            </nav>

            <main className="max-w-4xl mx-auto p-4 md:p-8 pb-20">
              <AnimatePresence mode="wait">
                {game?.status === 'lobby' ? (
                  <motion.div 
                    key="lobby"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid gap-8 md:grid-cols-[1fr_300px]"
                  >
              <div className="space-y-6">
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-3">
                      <Users className="text-blue-500" />
                      {t('lobby.ready')} ({game.players.length}/12)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {game.players.map((player) => (
                      <div 
                        key={player.id} 
                        className={`flex justify-between items-center p-3 rounded-2xl border ${player.id === socketRef.current?.id ? 'bg-orange-500/10 border-orange-500/30' : 'bg-neutral-800/50 border-neutral-700/50'} ${player.muted ? 'opacity-60 grayscale' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-lg bg-neutral-700" />
                          <div className="flex flex-col">
                            <span className="font-bold text-sm leading-none mb-1">{player.name}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] text-neutral-500 font-black uppercase tracking-tighter">
                                 {player.stats.wins}W / {player.stats.gamesPlayed}G
                               </span>
                               <span className="w-1 h-1 bg-neutral-700 rounded-full" />
                               <span className="text-[10px] text-orange-500/70 font-black uppercase tracking-tighter">
                                 Acc: {player.stats.totalGuesses > 0 ? Math.round((player.stats.correctGuesses / player.stats.totalGuesses) * 100) : 0}%
                               </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {me?.isHost && (
                            <div className="flex items-center gap-0.5 border-r border-neutral-700/50 pr-1.5 mr-1.5">
                              <button 
                                onClick={() => reorderPlayers(game.players.indexOf(player), 'up')}
                                disabled={game.players.indexOf(player) === 0}
                                className="p-1 hover:bg-neutral-700 rounded transition-all disabled:opacity-20"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button 
                                onClick={() => reorderPlayers(game.players.indexOf(player), 'down')}
                                disabled={game.players.indexOf(player) === game.players.length - 1}
                                className="p-1 hover:bg-neutral-700 rounded transition-all disabled:opacity-20"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          )}
                          {player.isHost && (
                            <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-400 font-bold uppercase tracking-wider border border-blue-500/30">{t('lobby.director')}</span>
                          )}
                          {me?.isHost && player.id !== socketRef.current?.id && (
                            <div className="flex items-center">
                              <button 
                                onClick={() => toggleMute(player.id)}
                                className={`p-1.5 rounded-md transition-all ${player.muted ? 'text-orange-500 bg-orange-500/10' : 'text-neutral-500 hover:text-white hover:bg-neutral-700'}`}
                                title={player.muted ? t('lobby.unmute') : t('lobby.mute')}
                              >
                                {player.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                              </button>
                              <button 
                                onClick={() => kickPlayer(player.id)}
                                className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                title={t('lobby.kick')}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {me?.isHost ? (
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center gap-3">
                        <Search className="text-orange-500" />
                        {t('lobby.parameters')}
                      </h3>
                      <button 
                        onClick={reshuffleSpies}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-orange-400 transition-all border border-neutral-800 hover:border-orange-500/30 px-3 py-1.5 rounded-full"
                      >
                         <RefreshCw size={12} /> {language === 'fa' ? 'تغییر جاسوس‌ها' : 'Reshuffle Roles'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{t('lobby.mode')}</label>
                        <div className="grid grid-cols-3 bg-neutral-800 rounded-xl p-1 gap-1">
                          {['classic', 'hardcore', 'speedrun'].map(mode => (
                            <button
                              key={mode}
                              onClick={() => updateSettings('mode', mode)}
                              className={`py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${game.settings.mode === mode ? 'bg-white text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                              {t(`modes.${mode}`)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{t('lobby.spies')}</label>
                        <div className="flex bg-neutral-800 rounded-xl p-1 gap-1">
                          {[1, 2, 3].map(n => (
                            <button
                              key={n}
                              onClick={() => updateSettings('spyCount', n)}
                              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${game.settings.spyCount === n ? 'bg-orange-500 text-neutral-950 shadow-lg' : 'text-neutral-400 hover:bg-neutral-700'}`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={game.settings.mode === 'speedrun' ? 'opacity-30 pointer-events-none space-y-2' : 'space-y-2'}>
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{t('lobby.voting')}</label>
                        <select 
                          value={game.settings.votingTime}
                          disabled={game.settings.mode === 'speedrun'}
                          onChange={(e) => updateSettings('votingTime', Number(e.target.value))}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/50"
                        >
                          <option value={30}>30 SEC</option>
                          <option value={60}>60 SEC</option>
                          <option value={90}>90 SEC</option>
                          <option value={120}>2 MIN</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{t('lobby.location_count')}</label>
                        <select 
                          value={game.settings.locationCount}
                          onChange={(e) => updateSettings('locationCount', Number(e.target.value))}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          {[5, 10, 15, 20, 25, 30].map(count => (
                            <option key={count} value={count}>{count}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{t('lobby.category')}</label>
                         <select 
                          value={game.settings.category.startsWith("Persian") ? "Persian (فارسی)" : game.settings.category}
                          onChange={(e) => updateSettings('category', e.target.value)}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="Metropolis">{t('categories.metropolis')}</option>
                          <option value="Espionage">{t('categories.espionage')}</option>
                          <option value="Adventure">{t('categories.adventure')}</option>
                          <option value="Fiction">{t('categories.fiction')}</option>
                          <option value="History">{t('categories.history')}</option>
                          <option value="Persian (فارسی)">{t('categories.persian')}</option>
                        </select>
                      </div>

                      {game.settings.category.startsWith("Persian") && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-2 overflow-hidden"
                        >
                          <label className="text-xs font-bold text-orange-500/80 uppercase tracking-widest flex items-center gap-2">
                            <Info size={12} /> {language === 'fa' ? 'انتخاب موضوع فارسی' : 'Persian Subject'}
                          </label>
                          <select 
                            value={game.settings.category}
                            onChange={(e) => updateSettings('category', e.target.value)}
                            className="w-full bg-neutral-800 border border-orange-500/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/50 text-orange-200"
                          >
                            <option value="Persian (فارسی)">{t('categories.persian')}</option>
                            <option value="Persian - Objects (اشیا)">{t('categories.persian_objects')}</option>
                            <option value="Persian - Environment (محیط زیست)">{t('categories.persian_env')}</option>
                            <option value="Persian - Heritage (میراث باستان)">{t('categories.persian_heritage')}</option>
                            <option value="Persian - Food (غذاها)">{t('categories.persian_food')}</option>
                            <option value="Persian - Cars (ماشین)">{t('categories.persian_cars')}</option>
                            <option value="Persian - Sci-Fi (علمی تخیلی)">{t('categories.persian_scifi')}</option>
                            <option value="Persian - People (شخصیت)">{t('categories.persian_people')}</option>
                            <option value="Persian - Media (فیلم و سریال)">{t('categories.persian_media')}</option>
                            <option value="Persian - General (اطلاعات عمومی)">{t('categories.persian_general')}</option>
                          </select>
                        </motion.div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold flex items-center gap-3 mb-6">
                      <Search className="text-orange-500" />
                      {t('lobby.parameters')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {t('lobby.mode')}
                        </p>
                        <p className="font-bold text-neutral-200 uppercase tracking-tight">
                          {t(`modes.${game.settings.mode}`)}
                        </p>
                      </div>
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {t('lobby.spies')}
                        </p>
                        <p className="font-bold text-neutral-200 underline decoration-orange-500 decoration-2">{game.settings.spyCount}</p>
                      </div>
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {t('lobby.voting')}
                        </p>
                        <p className="font-bold text-neutral-200">{game.settings.votingTime}s</p>
                      </div>
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {t('lobby.location_count')}
                        </p>
                        <p className="font-bold text-neutral-200">{game.settings.locationCount}</p>
                      </div>
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {t('lobby.category')}
                        </p>
                        <p className="font-bold text-neutral-200">
                          {game.settings.category.startsWith("Persian") 
                            ? t('categories.persian').split(' ')[0] 
                            : game.settings.category.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Info className="text-blue-500" />
                      {t('lobby.how_to_play')}
                    </div>
                    <button 
                      onClick={() => setShowDetailedHelp(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-all bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20"
                    >
                      {language === 'fa' ? 'جزئیات کامل' : 'Full Manual'}
                    </button>
                  </h3>
                  <div className="space-y-6 text-right" dir={language === 'fa' ? 'rtl' : 'ltr'}>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex-shrink-0 flex items-center justify-center text-blue-400 font-bold">1</div>
                      <div>
                        <p className="font-bold text-neutral-200 mb-1">{t('lobby.briefing_1_title')}</p>
                        <p className="text-sm text-neutral-500 leading-relaxed">{t('lobby.briefing_1_desc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex-shrink-0 flex items-center justify-center text-orange-400 font-bold">2</div>
                      <div>
                        <p className="font-bold text-neutral-200 mb-1">{t('lobby.briefing_2_title')}</p>
                        <p className="text-sm text-neutral-500 leading-relaxed">{t('lobby.briefing_2_desc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex-shrink-0 flex items-center justify-center text-red-500 font-bold">3</div>
                      <div>
                        <p className="font-bold text-neutral-200 mb-1">{t('lobby.briefing_3_title')}</p>
                        <p className="text-sm text-neutral-500 leading-relaxed">{t('lobby.briefing_3_desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                  {me?.isHost ? (
                    <>
                      <p className="text-neutral-400 mb-6 text-sm">{language === 'fa' ? 'ماموران خود را جمع کنید و عملیات را وقتی آماده بودید شروع کنید.' : 'Gather your agents and start the operation when ready.'}</p>
                      <button 
                        onClick={startGame}
                        disabled={game.players.length < 3}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 group"
                      >
                       <Play className={`group-hover:translate-x-1 transition-transform ${language === 'fa' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} /> {t('lobby.start_mission')}
                      </button>
                      {game.players.length < 3 && (
                        <p className="mt-4 text-xs text-neutral-500">{language === 'fa' ? 'حداقل ۳ بازیکن برای شروع لازم است.' : 'Need at least 3 players to start.'}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <Ghost size={32} className="text-neutral-600" />
                      </div>
                      <p className="text-neutral-400 font-medium">{t('lobby.waiting_for_director')}</p>
                    </>
                  )}
                </div>

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(game.id);
                    addToast(language === 'fa' ? 'کد کپی شد!' : 'Code copied!', 'success');
                  }}
                  className="border border-neutral-800 rounded-3xl p-6 text-center hover:bg-neutral-900/50 transition-colors group w-full"
                >
                  <p className="text-neutral-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">{t('enter_code')}</p>
                  <p className="text-4xl font-mono font-bold text-neutral-200 group-hover:text-orange-500 transition-colors">{game.id}</p>
                  <p className="mt-2 text-[8px] font-bold text-neutral-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    {language === 'fa' ? 'برای کپی کلیک کنید' : 'Click to Copy'}
                  </p>
                </button>
              </div>
            </motion.div>
          ) : game.status === 'playing' ? (
            <motion.div 
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-8 md:grid-cols-[1fr_350px] relative"
            >
              <AnimatePresence>
                {game.isPaused && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[40] bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-[2.5rem]"
                  >
                      <div className="text-center">
                        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                           <Pause size={40} className="text-white" />
                        </div>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter">{t('playing.paused_title')}</h2>
                        <p className="text-neutral-400 mt-2">{t('playing.paused_desc')}</p>
                        {me?.isHost && (
                          <button 
                            onClick={resumeGame}
                            className="mt-6 bg-white text-black font-black px-8 py-3 rounded-xl hover:scale-105 transition-transform uppercase tracking-wider"
                          >
                            {t('playing.resume')}
                          </button>
                        )}
                      </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                <div className="relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl">
                   {/* Background Highlight */}
                  <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none ${isSpy ? 'bg-orange-500/10' : 'bg-blue-500/10'}`} />

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSpy ? 'bg-orange-500' : 'bg-blue-600'}`}>
                        {isSpy ? <Ghost className="text-neutral-950 w-8 h-8" /> : <MapPin className="text-white w-8 h-8" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">{t('playing.your_role')}</p>
                        <h2 className={`text-4xl font-black tracking-tight ${isSpy ? 'text-orange-500' : 'text-white'}`}>
                          {isSpy ? t('playing.spy_role') : t('playing.agent_role')}
                        </h2>
                      </div>
                    </div>

                    <div className="bg-neutral-800/50 backdrop-blur-sm rounded-3xl p-8 border border-neutral-700/50">
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">{t('playing.mission_details')}</p>
                      {isSpy ? (
                        <div className="space-y-4">
                          <p className="text-xl text-neutral-200">{language === 'fa' ? 'شما مکان را نمی‌دانید.' : 'You do not know the location.'}</p>
                          <p className="text-sm text-orange-500/80 font-medium leading-relaxed italic">{t('playing.spy_notice')}</p>
                        </div>
                      ) : (
                        <div className="flex items-center  gap-4">
                           <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center">
                              <MapPin size={24} className="text-blue-500" />
                           </div>
                           <div>
                              <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">{t('playing.location')}</p>
                              <p className="text-4xl font-bold text-white tracking-tighter">{game?.location}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Users size={18} className="text-neutral-500" /> {language === 'fa' ? 'ماموران میدانی فعال' : 'Active Field Agents'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                       <button 
                        onClick={startVoting}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                      >
                        <AlertCircle size={14} /> {t('playing.accuse')}
                      </button>
                      {me?.isHost && (
                        <>
                          <button 
                            onClick={() => setShowHostPanel(!showHostPanel)}
                            className={`p-2 rounded-xl transition-all border ${showHostPanel ? 'bg-orange-500 text-black border-orange-500' : 'bg-neutral-800 text-orange-500 border-neutral-700'}`}
                            title={t('host.command_center')}
                          >
                            <Settings2 size={18} />
                          </button>
                          <button 
                            onClick={skipTurn}
                            className="bg-neutral-800 hover:bg-neutral-700 text-blue-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-neutral-700"
                            title="Force Skip Turn"
                          >
                            <SkipForward size={14} /> {language === 'fa' ? 'رد نوبت' : 'Skip'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {showHostPanel && me?.isHost && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-6"
                      >
                        <div className="bg-neutral-900 border border-orange-500/30 rounded-3xl p-6 space-y-6 shadow-2xl shadow-orange-500/5">
                           <div className="flex items-center justify-between">
                             <h4 className="text-sm font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                               <Settings2 size={16} /> {t('host.command_center')}
                             </h4>
                             <button 
                              onClick={reshuffleSpies}
                              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-400 hover:text-white transition-all bg-orange-500/10 border border-orange-500/30 px-4 py-2 rounded-full"
                            >
                               <RefreshCw size={12} /> {language === 'fa' ? 'تغییر نقش‌ها (فوری)' : 'Emergency Reshuffle'}
                            </button>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t('host.adjust_mid')}</label>
                                <div className="flex items-center gap-2">
                                   <select 
                                    value={game.settings.votingTime}
                                    onChange={(e) => updateSettings('votingTime', Number(e.target.value))}
                                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500/50"
                                  >
                                    <option value={30}>30 SEC</option>
                                    <option value={60}>60 SEC</option>
                                    <option value={90}>90 SEC</option>
                                    <option value={120}>2 MIN</option>
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t('host.advanced')}</label>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={game.isPaused ? resumeGame : pauseGame}
                                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 rounded-xl text-xs font-bold uppercase border border-neutral-700 transition-all flex items-center justify-center gap-2"
                                  >
                                    {game.isPaused ? <PlayCircle size={14} /> : <Pause size={14} />} 
                                    {game.isPaused ? t('playing.resume') : t('playing.pause')}
                                  </button>
                                </div>
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-4">
                    {game?.players.map(p => {
                       const isTurn = game.currentTurnId === p.id;
                       return (
                        <div key={p.id} className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${p.id === socketRef.current?.id ? 'bg-orange-500/5 border-orange-500/30 shadow-inner' : 'bg-neutral-800/50 border-neutral-700'}`}>
                          {isTurn && (
                            <motion.div 
                              layoutId="turn-indicator"
                              className={`absolute top-0 bottom-0 w-1 bg-blue-500 ${language === 'fa' ? 'right-0' : 'left-0'}`}
                            />
                          )}
                          <div className="flex items-center justify-between">
                            <p className="font-bold mb-0.5 text-neutral-100 flex items-center gap-2">
                              {p.name}
                              {p.muted && <VolumeX size={12} className="text-red-500" />}
                            </p>
                            {isTurn && (
                              <span className="text-[8px] bg-blue-500 text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                                {t('playing.turn')}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{p.id === socketRef.current?.id ? (language === 'fa' ? 'شما' : 'You') : (language === 'fa' ? 'مامور میدانی' : 'Field Agent')}</p>
                        </div>
                       );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
                    <Search size={14} /> {t('playing.locations_list')}
                  </div>
                  <div className="max-h-[500px] overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                    {game?.locations.map(loc => (
                      <div 
                        key={loc} 
                        onClick={() => isSpy && spyGuess(loc)}
                        className={`text-sm p-3 rounded-xl border transition-all ${isSpy ? 'hover:border-orange-500 cursor-pointer hover:bg-orange-500/5' : ''} ${loc === game.location && !isSpy ? 'border-blue-500/40 bg-blue-500/5 text-blue-200' : 'border-neutral-800 bg-neutral-900/50 text-neutral-400'}`}
                      >
                        {loc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : game.status === 'voting' ? (
            <motion.div 
              key="voting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], rotate: game.votingTimer <= 5 ? [-1, 1, -1] : 0 }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className={`w-24 h-24 mx-auto rounded-full flex flex-col items-center justify-center mb-6 shadow-2xl relative border-4 ${
                    game.votingTimer <= 10 ? 'bg-red-600 border-red-500 shadow-red-500/40' : 'bg-neutral-800 border-neutral-700 shadow-orange-500/20'
                  }`}
                >
                   <p className="text-[10px] font-black uppercase text-neutral-400 leading-none mb-1">{language === 'fa' ? 'زمان' : 'TIME'}</p>
                   <span className={`text-4xl font-black leading-none ${game.votingTimer <= 10 ? 'text-white' : 'text-orange-500'}`}>
                    {game.votingTimer}
                   </span>
                </motion.div>
                <h2 className="text-5xl font-black tracking-tighter mb-2 uppercase italic">{t('voting.emergency_meeting')}</h2>
                <p className="text-neutral-400 font-medium max-w-sm mx-auto">{t('voting.emergency_desc')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {game.players.map(p => (
                   <button
                    key={p.id}
                    onClick={() => castVote(p.id)}
                    disabled={!!myVote}
                    className={`flex items-center justify-between p-6 rounded-3xl border transition-all group ${
                      myVote === p.id 
                        ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.1)]' 
                        : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-bold text-xl">{p.name}</p>
                      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{p.id === socketRef.current?.id ? (language === 'fa' ? 'نام مستعار شما' : 'Your Alias') : (language === 'fa' ? 'مظنون' : 'Suspect')}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${myVote === p.id ? 'border-orange-500 bg-orange-500' : 'border-neutral-700'}`}>
                      {myVote === p.id && <div className="w-2 h-2 bg-black rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-center pt-8">
                 <p className="text-neutral-500 font-medium">
                  {Object.keys(game.votes || {}).length} {language === 'fa' ? 'از' : 'of'} {game.players.length} {language === 'fa' ? 'مامور رای داده‌اند...' : 'agents have voted...'}
                </p>
                <div className="w-full bg-neutral-900 h-1.5 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(Object.keys(game.votes || {}).length / game.players.length) * 100}%` }}
                    className="bg-orange-500 h-full"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto space-y-8 text-center relative"
            >
              {/* Reveal Animation Overlay */}
              <AnimatePresence>
                {hasPlayedReveal && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 3, duration: 0.8 }}
                    onAnimationComplete={() => setHasPlayedReveal(false)}
                    className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
                  >
                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                      transition={{ duration: 0.6 }}
                      className={`relative w-64 h-64 flex items-center justify-center rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] ${game.winner === 'agents' ? 'bg-blue-600' : 'bg-orange-500'}`}
                    >
                      {/* Rays */}
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 0], scale: [1, 2], rotate: i * 30 }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                          className={`absolute w-1 h-32 origin-bottom ${game.winner === 'agents' ? 'bg-blue-400/50' : 'bg-orange-300/50'}`}
                          style={{ bottom: '50%' }}
                        />
                      ))}
                      
                      <div className="relative z-10 flex flex-col items-center">
                        {game.winner === 'agents' ? (
                          <>
                            <Users size={80} className="text-white mb-4" />
                            <h2 className="text-4xl font-black italic tracking-tighter text-white">AGENTS VICTORIOUS</h2>
                          </>
                        ) : (
                          <>
                            <Ghost size={80} className="text-black mb-4" />
                            <h2 className="text-4xl font-black italic tracking-tighter text-black">SPY ESCAPED</h2>
                          </>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`p-12 rounded-[3rem] border ${game.winner === 'agents' ? 'bg-blue-600/10 border-blue-600/30 shadow-[0_0_50px_rgba(37,99,235,0.15)]' : 'bg-orange-600/10 border-orange-600/30 shadow-[0_0_50px_rgba(249,115,22,0.15)]'}`}>
                <div className="flex justify-center mb-6">
                   <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${game.winner === 'agents' ? 'bg-blue-600' : 'bg-orange-500'}`}>
                    {game.winner === 'agents' ? <Users size={48} className="text-white" /> : <Ghost size={48} className="text-black" />}
                  </div>
                </div>
                
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-500 mb-2">{language === 'fa' ? 'نتیجه عملیات' : 'Operation Outcome'}</p>
                <h2 className="text-6xl font-black tracking-tighter mb-4 italic uppercase">
                  {game.winner === 'agents' ? t('results.winner_agents') : t('results.winner_spies')}
                </h2>
                
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/5 mb-8">
                  <p className="text-lg font-medium text-neutral-200 leading-relaxed italic underline decoration-neutral-700 underline-offset-8">
                    "{game.winningReason}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">{t('results.location')}</p>
                    <p className="font-bold text-lg text-white">{game.location}</p>
                  </div>
                  <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">{t('results.spies')}</p>
                    <p className="font-bold text-lg text-orange-500">
                      {game.players.filter(p => game.spyIds.includes(p.id)).map(p => p.name).join(', ')}
                    </p>
                  </div>
                </div>

                {me?.isHost && (
                  <div className="space-y-3">
                    <button 
                      onClick={resetGame}
                      className="w-full bg-white text-black font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl flex items-center justify-center gap-3 uppercase tracking-wider"
                    >
                      {t('results.play_again')} <ChevronRight size={20} className={language === 'fa' ? 'rotate-180' : ''} />
                    </button>
                    <button 
                      onClick={reshuffleSpies}
                      className="w-full bg-neutral-800 hover:bg-neutral-700 text-orange-500 font-bold py-3 rounded-2xl transition-all border border-neutral-700 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                    >
                      <RefreshCw size={16} /> {language === 'fa' ? 'شروع مجدد با نقش‌های جدید' : 'New Round (Same Lineup)'}
                    </button>
                  </div>
                )}
                {!me?.isHost && (
                  <p className="text-neutral-500 font-medium italic">{language === 'fa' ? 'در انتظار بازآرایی توسط مدیر...' : 'Waiting for host to redeploy...'}</p>
                )}
              </div>

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6 underline decoration-neutral-700">{t('results.roster')}</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {game.players.map(p => {
                      const playerIsSpy = game.spyIds.includes(p.id);
                      const losses = p.stats.gamesPlayed - p.stats.wins;
                      return (
                        <div key={p.id} className="flex flex-col gap-4 bg-neutral-800/30 p-4 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-colors" dir={language === 'fa' ? 'rtl' : 'ltr'}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${playerIsSpy ? 'bg-orange-500/20 border border-orange-500/40' : 'bg-blue-600/20 border border-blue-600/40'}`}>
                              {playerIsSpy ? <Ghost size={24} className="text-orange-500" /> : <Users size={24} className="text-blue-500" />}
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-neutral-100">{p.name}</p>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${playerIsSpy ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {playerIsSpy ? (language === 'fa' ? 'جاسوس' : 'Spy') : (language === 'fa' ? 'مامور' : 'Agent')}
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-500 uppercase font-bold mt-1">
                                {p.stats.wins} {language === 'fa' ? 'برد' : 'Wins'} / {p.stats.gamesPlayed} {language === 'fa' ? 'بازی' : 'Ops'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 border-t border-neutral-800 pt-3">
                            <div className="text-center p-1.5 bg-black/20 rounded-xl border border-white/5">
                              <p className="text-[8px] font-black text-neutral-500 uppercase leading-none mb-1">{t('stats.accuracy')}</p>
                              <p className="text-[10px] font-mono font-bold text-orange-400">
                                {p.stats.totalGuesses > 0 ? Math.round((p.stats.correctGuesses / p.stats.totalGuesses) * 100) : 0}%
                              </p>
                            </div>
                            <div className="text-center p-1.5 bg-black/20 rounded-xl border border-white/5">
                              <p className="text-[8px] font-black text-neutral-500 uppercase leading-none mb-1">{t('stats.successful_votes')}</p>
                              <p className="text-[10px] font-mono font-bold text-blue-400">{p.stats.successfulVotes}</p>
                            </div>
                            <div className="text-center p-1.5 bg-black/20 rounded-xl border border-white/5">
                              <p className="text-[8px] font-black text-neutral-500 uppercase leading-none mb-1">{t('stats.avg_duration')}</p>
                              <p className="text-[10px] font-mono font-bold text-green-400">
                                {p.stats.gamesPlayed > 0 ? Math.round(p.stats.totalPlayTime / p.stats.gamesPlayed) : 0}s
                              </p>
                            </div>
                            <div className="text-center p-1.5 bg-black/20 rounded-xl border border-white/5">
                              <p className="text-[8px] font-black text-neutral-500 uppercase leading-none mb-1">{t('stats.total_time')}</p>
                              <p className="text-[10px] font-mono font-bold text-purple-400">
                                {p.stats.totalPlayTime > 3600 ? Math.round(p.stats.totalPlayTime / 3600) + 'h' : Math.round(p.stats.totalPlayTime / 60) + 'm'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <footer className="max-w-4xl mx-auto p-8 text-center border-t border-neutral-900">
           <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-[0.4em]">{language === 'fa' ? 'تکنولوژی اختصاصی تیم DeepInk' : 'Proprietary Technology of DeepInk Team'}</p>
        </footer>

        <AnimatePresence>
          {showDetailedHelp && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setShowDetailedHelp(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowDetailedHelp(false)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:bg-neutral-700 transition-colors"
                >
                  ✕
                </button>
                <h3 className="text-3xl font-black mb-8 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <Info size={28} className="text-white" />
                  </div>
                  {t('instructions.title')}
                </h3>
                
                <div className="space-y-8" dir={language === 'fa' ? 'rtl' : 'ltr'}>
                  <section className="bg-neutral-800/30 p-6 rounded-3xl border border-neutral-800">
                    <h4 className="text-xl font-bold mb-3 flex items-center gap-2 text-blue-400">
                      <Users size={20} /> {t('instructions.agents_goal')}
                    </h4>
                    <p className="text-neutral-400 leading-relaxed text-sm md:text-base">
                      {t('instructions.agents_desc')}
                    </p>
                  </section>

                  <section className="bg-orange-500/5 p-6 rounded-3xl border border-orange-500/20">
                    <h4 className="text-xl font-bold mb-3 flex items-center gap-2 text-orange-500">
                      <Ghost size={20} /> {t('instructions.spy_goal')}
                    </h4>
                    <p className="text-neutral-400 leading-relaxed text-sm md:text-base">
                      {t('instructions.spy_desc')}
                    </p>
                  </section>

                  <section className="grid md:grid-cols-2 gap-6">
                    <div className="bg-neutral-800/30 p-6 rounded-3xl border border-neutral-800">
                      <h4 className="text-lg font-bold mb-2 text-red-500 uppercase tracking-tight">{language === 'fa' ? 'رای‌گیری' : 'Voting'}</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {t('instructions.voting_desc')}
                      </p>
                    </div>
                    <div className="bg-neutral-800/30 p-6 rounded-3xl border border-neutral-800">
                      <h4 className="text-lg font-bold mb-2 text-green-500 uppercase tracking-tight">{language === 'fa' ? 'حدس زدن' : 'Guessing'}</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {t('instructions.guessing_desc')}
                      </p>
                    </div>
                  </section>

                  <section className="border-t border-neutral-800 pt-6">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">{t('instructions.tips')}</h4>
                    <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 italic text-sm text-neutral-300">
                      "{t('instructions.tips_desc')}"
                    </div>
                  </section>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showModeInfo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setShowModeInfo(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowModeInfo(false)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:bg-neutral-700"
                >
                  ✕
                </button>
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <Info className="text-blue-500" />
                  {language === 'fa' ? 'اطلاعات حالت‌ها' : 'Mode Intelligence'}
                </h3>
                
                <div className="space-y-6">
                  {['classic', 'hardcore', 'speedrun'].map(m => (
                    <div key={m} className={`p-4 rounded-2xl border ${m === 'classic' ? 'bg-neutral-800/50 border-neutral-700' : m === 'hardcore' ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                      <p className={`text-xs font-black uppercase mb-1 ${m === 'hardcore' ? 'text-red-500' : m === 'speedrun' ? 'text-orange-500' : 'text-white'}`}>{t(`modes.${m}`)}</p>
                      <p className="text-sm text-neutral-400 leading-relaxed">{t(`modes.${m}_desc`)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {showLeaderboard && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
               onClick={() => setShowLeaderboard(false)}
            >
              <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative max-h-[80vh] flex flex-col"
                 onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowLeaderboard(false)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:bg-neutral-700"
                >
                  ✕
                </button>
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <Trophy size={28} className="text-orange-500" />
                  Global Records
                </h3>
                
                <div className="overflow-y-auto flex-grow pr-2 custom-scrollbar space-y-3">
                  {leaderboard.length === 0 ? (
                    <div className="py-20 text-center text-neutral-500 font-medium">No records established yet.</div>
                  ) : (
                    leaderboard.map((user, idx) => (
                      <div key={user.name} className="flex items-center gap-4 bg-neutral-800/40 p-4 rounded-2xl border border-neutral-800">
                        <div className="w-10 text-xl font-black text-neutral-600">#{idx + 1}</div>
                        <img src={user.avatar} className="w-12 h-12 rounded-xl bg-neutral-700" />
                        <div className="flex-grow">
                          <p className="font-bold text-neutral-100">{user.name}</p>
                          <p className="text-[10px] text-neutral-500 uppercase font-black">{user.stats.gamesPlayed} Operations Conducted</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-orange-500">{user.stats.wins}</p>
                          <p className="text-[10px] text-neutral-500 uppercase font-bold">Total Wins</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      `}} />
    </div>
  );
}
