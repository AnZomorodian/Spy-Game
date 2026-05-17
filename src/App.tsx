/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Users, MapPin, Play, LogOut, ChevronRight, AlertCircle, Search, Info, Trash2, Pause, PlayCircle, Trophy } from 'lucide-react';
import { GameState, Player, UserSummary } from './types.ts';

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<UserSummary[]>([]);
  const socketRef = useRef<Socket | null>(null);

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

    socketRef.current.on('error', (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const createGame = () => {
    if (!playerName.trim()) return setError('Please enter your name');
    socketRef.current?.emit('createGame', playerName);
  };

  const joinGame = () => {
    if (!playerName.trim()) return setError('Please enter your name');
    if (!gameCode.trim()) return setError('Please enter game code');
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

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500/30 flex items-center justify-center p-4">
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
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              <Ghost className="text-neutral-950 w-8 h-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2">DEEP SPY</h1>
            <p className="text-neutral-400 text-sm text-center uppercase tracking-widest font-bold">Infiltration & Deception</p>
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
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Your Alias</label>
              <input 
                type="text" 
                placeholder="Enter name..."
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
                Create New Mission <ChevronRight size={18} />
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-neutral-800"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-neutral-600 uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-neutral-800"></div>
              </div>

              <button 
                onClick={fetchLeaderboard}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-neutral-700 mt-2"
              >
                <Trophy size={18} className="text-orange-500" /> View Hall of Fame
              </button>

              <div className="relative flex items-center py-2">
                 <div className="flex-grow border-t border-dotted border-neutral-800"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Game Access Code</label>
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
                    className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-6 rounded-xl transition-all flex items-center justify-center"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <footer className="fixed bottom-6 left-0 right-0 text-center z-10">
          <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-[0.4em]">Designed by DeepInk Team</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-orange-500/30">
      <nav className="border-bottom border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Ghost className="text-neutral-950 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest leading-none mb-1">Mission Active</p>
              <h2 className="text-xl font-bold tracking-tight text-white leading-none">
                {game?.status === 'lobby' ? 'In Lobby' : 'In Progress'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowModeInfo(true)}
              className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-all text-blue-400"
            >
              <Info size={20} />
            </button>
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Code</p>
              <p className="text-lg font-mono font-bold text-orange-500">{game?.id}</p>
            </div>
            <button 
              onClick={leaveGame}
              className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-all text-neutral-400 hover:text-white"
            >
              <LogOut size={20} />
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
                      Agents Ready ({game.players.length}/12)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {game.players.map((player) => (
                      <div 
                        key={player.id} 
                        className={`flex justify-between items-center p-3 rounded-2xl border ${player.id === socketRef.current?.id ? 'bg-orange-500/10 border-orange-500/30' : 'bg-neutral-800/50 border-neutral-700/50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-lg bg-neutral-700" />
                          <div className="flex flex-col">
                            <span className="font-bold text-sm leading-none mb-1">{player.name}</span>
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-tighter">
                              {player.stats.wins} Wins • {player.stats.gamesPlayed} Matches
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {player.isHost && (
                            <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-400 font-bold uppercase tracking-wider border border-blue-500/30">Director</span>
                          )}
                          {me?.isHost && player.id !== socketRef.current?.id && (
                            <button 
                              onClick={() => kickPlayer(player.id)}
                              className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                              title="Kick Player"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {me?.isHost ? (
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 space-y-6 shadow-xl">
                    <h3 className="text-lg font-bold flex items-center gap-3">
                      <Search className="text-orange-500" />
                      Mission Parameters
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Game Mode</label>
                        <div className="grid grid-cols-3 bg-neutral-800 rounded-xl p-1 gap-1">
                          {['classic', 'hardcore', 'speedrun'].map(mode => {
                            const labels: Record<string, string> = { 
                              classic: game.settings.category.includes('Persian') ? 'کلاسیک' : 'Classic',
                              hardcore: game.settings.category.includes('Persian') ? 'هاردکور' : 'Hardcore',
                              speedrun: game.settings.category.includes('Persian') ? 'سرعتی' : 'Speedrun'
                            };
                            return (
                              <button
                                key={mode}
                                onClick={() => updateSettings('mode', mode)}
                                className={`py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${game.settings.mode === mode ? 'bg-white text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                              >
                                {labels[mode]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Spy Count</label>
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
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Voting Time</label>
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
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Category</label>
                         <select 
                          value={game.settings.category}
                          onChange={(e) => updateSettings('category', e.target.value)}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          {["Metropolis", "Espionage", "Adventure", "Fiction", "History", "Persian (فارسی)"].map(cat => (
                            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold flex items-center gap-3 mb-6">
                      <Search className="text-orange-500" />
                      Mission Parameters
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {game.settings.category.includes('Persian') ? 'حالت بازی' : 'Mode'}
                        </p>
                        <p className="font-bold text-neutral-200 uppercase tracking-tight">
                          {game.settings.mode === 'classic' && (game.settings.category.includes('Persian') ? 'کلاسیک' : 'classic')}
                          {game.settings.mode === 'hardcore' && (game.settings.category.includes('Persian') ? 'هاردکور' : 'hardcore')}
                          {game.settings.mode === 'speedrun' && (game.settings.category.includes('Persian') ? 'سرعتی' : 'speedrun')}
                        </p>
                      </div>
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {game.settings.category.includes('Persian') ? 'تعداد جاسوس' : 'Spies'}
                        </p>
                        <p className="font-bold text-neutral-200 underline decoration-orange-500 decoration-2">{game.settings.spyCount}</p>
                      </div>
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {game.settings.category.includes('Persian') ? 'زمان رای' : 'Voting'}
                        </p>
                        <p className="font-bold text-neutral-200">{game.settings.votingTime}s</p>
                      </div>
                      <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                          {game.settings.category.includes('Persian') ? 'دسته‌بندی' : 'Category'}
                        </p>
                        <p className="font-bold text-neutral-200">{game.settings.category.replace(' (فارسی)', '').toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <Info className="text-blue-500" />
                    Operational Briefing
                  </h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex-shrink-0 flex items-center justify-center text-blue-400 font-bold">1</div>
                      <div>
                        <p className="font-bold text-neutral-200 mb-1">Intelligence Gathering</p>
                        <p className="text-sm text-neutral-500 leading-relaxed">Agents are assigned a <span className="text-blue-400">Secret Location</span>. The Spy knows nothing and must blend in by mirroring agent behavior.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex-shrink-0 flex items-center justify-center text-orange-400 font-bold">2</div>
                      <div>
                        <p className="font-bold text-neutral-200 mb-1">Strategic Interrogation</p>
                        <p className="text-sm text-neutral-500 leading-relaxed">Take turns asking vague but revealing questions. "Is the decor expensive here?" or "Would I want a coffee now?"</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex-shrink-0 flex items-center justify-center text-red-500 font-bold">3</div>
                      <div>
                        <p className="font-bold text-neutral-200 mb-1">Extraction or Exposure</p>
                        <p className="text-sm text-neutral-500 leading-relaxed">The Spy can guess the location anytime to win. Agents must trigger an <span className="text-red-500">Emergency Vote</span> to identify and eject the Spy.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden text-center">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                  {me?.isHost ? (
                    <>
                      <p className="text-neutral-400 mb-6 text-sm">Gather your agents and start the operation when ready.</p>
                      <button 
                        onClick={startGame}
                        disabled={game.players.length < 3}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 group"
                      >
                       <Play className="group-hover:translate-x-1 transition-transform" /> Start Mission
                      </button>
                      {game.players.length < 3 && (
                        <p className="mt-4 text-xs text-neutral-500">Need at least 3 players to start.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <Ghost size={32} className="text-neutral-600" />
                      </div>
                      <p className="text-neutral-400 font-medium">Waiting for the host to start...</p>
                    </>
                  )}
                </div>

                <div className="border border-neutral-800 rounded-3xl p-6 text-center">
                  <p className="text-neutral-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">Invite Code</p>
                  <p className="text-4xl font-mono font-bold text-neutral-200">{game.id}</p>
                </div>
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
                      <h2 className="text-4xl font-black italic uppercase tracking-tighter">Operation Paused</h2>
                      <p className="text-neutral-400 mt-2">Director has suspended all field operations.</p>
                      {me?.isHost && (
                        <button 
                          onClick={resumeGame}
                          className="mt-6 bg-white text-black font-black px-8 py-3 rounded-xl hover:scale-105 transition-transform uppercase tracking-wider"
                        >
                          Resume Mission
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
                        {isSpy ? <Ghost className="text-neutral-950 w-8 h-8" /> : <MapPin className="text-neutral-500 w-8 h-8" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">Your Secret Role</p>
                        <h2 className={`text-4xl font-black tracking-tight ${isSpy ? 'text-orange-500' : 'text-white'}`}>
                          {isSpy ? 'THE SPY' : 'SECRET AGENT'}
                        </h2>
                      </div>
                    </div>

                    <div className="bg-neutral-800/50 backdrop-blur-sm rounded-3xl p-8 border border-neutral-700/50">
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Current Intel</p>
                      {isSpy ? (
                        <div className="space-y-4">
                          <p className="text-xl text-neutral-200">You do not know the location.</p>
                          <p className="text-sm text-orange-500/80 font-medium leading-relaxed italic">Listen closely to others and try to figure out where they are based on their questions and answers. Click a location on the right to guess it and win instantly!</p>
                        </div>
                      ) : (
                        <div className="flex items-center  gap-4">
                           <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center">
                              <MapPin size={24} className="text-blue-500" />
                           </div>
                           <div>
                              <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Location</p>
                              <p className="text-4xl font-bold text-white tracking-tighter">{game?.location}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Users size={18} className="text-neutral-500" /> Active Field Agents
                    </h3>
                    <button 
                      onClick={startVoting}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                      <AlertCircle size={14} /> Accuse Someone
                    </button>
                    {me?.isHost && (
                      <button 
                        onClick={game.isPaused ? resumeGame : pauseGame}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                      >
                        {game.isPaused ? <PlayCircle size={14} /> : <Pause size={14} />} {game.isPaused ? 'Resume' : 'Pause'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {game?.players.map(p => (
                      <div key={p.id} className={`p-4 rounded-2xl border transition-colors ${p.id === socketRef.current?.id ? 'bg-orange-500/5 border-orange-500/30' : 'bg-neutral-800/50 border-neutral-700'}`}>
                        <p className="font-bold mb-0.5 text-neutral-100">{p.name}</p>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{p.id === socketRef.current?.id ? 'You' : 'Field Agent'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
                    <Search size={14} /> Potential Locations
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
                <div className="w-16 h-16 bg-red-500 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                   <span className="text-2xl font-black text-black">{game.votingTimer}</span>
                </div>
                <h2 className="text-4xl font-black tracking-tight mb-2 uppercase">Emergency Meeting</h2>
                <p className="text-neutral-400">The undercover operative is among us. Cast your vote now.</p>
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
                      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{p.id === socketRef.current?.id ? 'Your Alias' : 'Suspect'}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${myVote === p.id ? 'border-orange-500 bg-orange-500' : 'border-neutral-700'}`}>
                      {myVote === p.id && <div className="w-2 h-2 bg-black rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-center pt-8">
                 <p className="text-neutral-500 font-medium">
                  {Object.keys(game.votes || {}).length} of {game.players.length} agents have voted...
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
              className="max-w-2xl mx-auto space-y-8 text-center"
            >
              <div className={`p-12 rounded-[3rem] border ${game.winner === 'agents' ? 'bg-blue-600/10 border-blue-600/30 shadow-[0_0_50px_rgba(37,99,235,0.15)]' : 'bg-orange-600/10 border-orange-600/30 shadow-[0_0_50px_rgba(249,115,22,0.15)]'}`}>
                <div className="flex justify-center mb-6">
                   <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${game.winner === 'agents' ? 'bg-blue-600' : 'bg-orange-500'}`}>
                    {game.winner === 'agents' ? <Users size={48} className="text-white" /> : <Ghost size={48} className="text-black" />}
                  </div>
                </div>
                
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-500 mb-2">Operation Outcome</p>
                <h2 className="text-6xl font-black tracking-tighter mb-4 italic uppercase">
                  {game.winner === 'agents' ? 'Agents Win' : 'Spy Won'}
                </h2>
                
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/5 mb-8">
                  <p className="text-lg font-medium text-neutral-200 leading-relaxed italic underline decoration-neutral-700 underline-offset-8">
                    "{game.winningReason}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Target Location</p>
                    <p className="font-bold text-lg text-white">{game.location}</p>
                  </div>
                  <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">The Spies</p>
                    <p className="font-bold text-lg text-orange-500">
                      {game.players.filter(p => game.spyIds.includes(p.id)).map(p => p.name).join(', ')}
                    </p>
                  </div>
                </div>

                {me?.isHost && (
                  <button 
                    onClick={resetGame}
                    className="w-full bg-white text-black font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl flex items-center justify-center gap-3 uppercase tracking-wider"
                  >
                    Deploy New Mission <ChevronRight size={20} />
                  </button>
                )}
                {!me?.isHost && (
                  <p className="text-neutral-500 font-medium italic">Waiting for host to redeploy...</p>
                )}
              </div>

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6 underline decoration-neutral-700">Mission Roster</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {game.players.map(p => {
                      const playerIsSpy = game.spyIds.includes(p.id);
                      const losses = p.stats.gamesPlayed - p.stats.wins;
                      return (
                        <div key={p.id} className="flex items-center gap-4 bg-neutral-800/30 p-4 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                          <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${playerIsSpy ? 'bg-orange-500/20 border border-orange-500/40' : 'bg-blue-600/20 border border-blue-600/40'}`}>
                            {playerIsSpy ? <Ghost size={24} className="text-orange-500" /> : <Users size={24} className="text-blue-500" />}
                          </div>
                          <div className="flex-grow text-left">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-neutral-100">{p.name}</p>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${playerIsSpy ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {playerIsSpy ? 'Spy' : 'Agent'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                               <div className="text-center">
                                 <p className="text-[10px] font-bold text-neutral-500 uppercase">Wins</p>
                                 <p className="text-xs font-mono font-bold text-green-500">{p.stats.wins}</p>
                               </div>
                               <div className="text-center">
                                 <p className="text-[10px] font-bold text-neutral-500 uppercase">Loss</p>
                                 <p className="text-xs font-mono font-bold text-red-500">{losses}</p>
                               </div>
                               <div className="text-center">
                                 <p className="text-[10px] font-bold text-neutral-500 uppercase">S-Wins</p>
                                 <p className="text-xs font-mono font-bold text-orange-500">{p.stats.spyWins}</p>
                               </div>
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
           <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-[0.4em]">Proprietary Technology of DeepInk Team</p>
        </footer>

        <AnimatePresence>
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
                  Mode Intelligence
                </h3>
                
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-xs font-black uppercase text-white">Classic</p>
                       <p className="text-[10px] font-bold text-neutral-500">کلاسیک</p>
                    </div>
                    <p className="text-sm text-neutral-400 leading-relaxed mb-2">The standard protocol. All locations are visible to agents. Standard communication channels.</p>
                    <p className="text-[10px] text-neutral-500 leading-relaxed border-t border-neutral-700 pt-2 font-medium" dir="rtl">
                      قوانین استاندارد. تمام مکان‌ها برای ماموران قابل مشاهده هستند. کانال‌های ارتباطی عادی.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-black uppercase text-red-500">Hardcore</p>
                      <p className="text-[10px] font-bold text-red-500/50">هاردکور</p>
                    </div>
                    <p className="text-sm text-neutral-400 leading-relaxed mb-2">High variance. Shuffled locations list with 5 fake decoys added to confuse the Spy. Reduced voting time (45s).</p>
                    <p className="text-[10px] text-neutral-500 leading-relaxed border-t border-red-500/10 pt-2 font-medium" dir="rtl">
                      ریسک بالا. لیست مکان‌ها با ۵ مورد جعلی ترکیب شده تا جاسوس را گیج کند. زمان رای‌گیری کاهش یافته (۴۵ ثانیه).
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-black uppercase text-orange-500">Speedrun</p>
                      <p className="text-[10px] font-bold text-orange-500/50">سرعتی</p>
                    </div>
                    <p className="text-sm text-neutral-400 leading-relaxed mb-2">Maximum efficiency required. Voting is restricted to 15s. Only the fastest brains survive.</p>
                    <p className="text-[10px] text-neutral-500 leading-relaxed border-t border-orange-500/10 pt-2 font-medium" dir="rtl">
                      نیاز به حداکثر کارایی. رای‌گیری محدود به ۱۵ ثانیه است. فقط سریع‌ترین مغزها زنده می‌مانند.
                    </p>
                  </div>
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

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      `}} />
    </div>
  );
}
