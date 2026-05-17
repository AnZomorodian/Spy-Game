import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { nanoid } from 'nanoid';

const CATEGORIES: Record<string, string[]> = {
  "Metropolis": [
    "Airport", "Bank", "Beach", "Broadway Theater", "Casino", "Cathedral", "Circus Tent", "Corporate Party",
    "Embassy", "Hospital", "Hotel", "Military Base", "Movie Studio", "Ocean Liner",
    "Passenger Train", "Police Station", "Restaurant", "School", "Supermarket", "University", "Art Museum",
    "Stock Exchange", "Skyscraper Rooftop", "Subway Station", "Shopping Mall", "Public Park",
    "Construction Site", "Luxury Villa", "Nightclub", "Public Library", "Tennis Court", "Fire Station",
    "Harbor", "Ice Rink", "Convention Center", "Luxury Spa", "Clock Tower", "City Hall"
  ],
  "Espionage": [
    "NSA Headquarters", "MI6 Safehouse", "Russian Bunker", "Underground Lab", "Intelligence Hub",
    "Satellite Control", "Encryption Center", "Safe House", "Black Site", "Arms Depot",
    "Cyber Command", "Safe Deposit Vault", "Dead Drop Location", "Embassy Roof", "Global Data Center",
    "Hidden Hangar", "Terrorist Cell", "Diplomatic Reception", "High-Security Prison",
    "Counter-Intelligence Cell", "Shadow Government Bunker", "Nuclear Silo", "Stealth Frigate"
  ],
  "Adventure": [
    "Pirate Ship", "Space Station", "Submarine", "Polar Station", "Space Base", "Amusement Park", "Crusader Army", "Day Spa", "Service Station",
    "Jungle Camp", "Desert Oasis", "Mountain Summit", "Underwater Lab", "Safari Lodge"
  ],
  "Fiction": [
    "Wizard Tower", "Dragon Cave", "Elf Forest", "Dwarf Mine", "Cloud Kingdom", "Zombie Outpost", "Mars Colony", "Time Machine Hub",
    "Superhero Hideout", "Galactic Senate", "Cyberpunk Slums", "Alien Hive"
  ],
  "History": [
    "Medieval Castle", "Ancient Rome", "Viking Village", "Victorian London", "Samurai Dojo", "Mayan Temple", "WWI Trenches", "Industrial Mill",
    "Pharaoh's Tomb", "Wild West Saloon", "Versailles Palace", "Pirate Cove"
  ],
  "Persian (فارسی)": [
    "فرودگاه", "بانک", "ساحل", "تئاتر برادوی", "کازینو", "کلیسای جامع", "سیرک", "مهمانی شرکتی",
    "سفارت", "بیمارستان", "هتل", "پایگاه نظامی", "استودیو فیلمسازی", "کشتی اقیانوس‌پیما",
    "قطار مسافربری", "کلانتری", "رستوران", "مدرسه", "سوپرمارکت", "دانشگاه", "موزه هنر",
    "پنت‌هاوس", "ایستگاه مترو", "مرکز خرید", "پارک عمومی", "سایت ساختمانی", "ویلای لوکس",
    "کتابخانه عمومی", "ایستگاه آتش‌نشانی", "بندر", "مرکز همایش", "برج ساعت", "شهرداری"
  ]
};

const MODE_DESCRIPTIONS: Record<string, string> = {
  "classic": "قوانین استاندارد. رای‌گیری ۶۰ ثانیه. تمام مکان‌ها نمایش داده می‌شوند.",
  "hardcore": "ریسک بالا. رای‌گیری ۴۵ ثانیه. لیست مکان‌ها با ۵ مکان جعلی ترکیب می‌شود.",
  "speedrun": "سرعت بالا. رای‌گیری ۱۵ ثانیه. وقتی برای تردید نیست."
};

const games: Record<string, any> = {};
const users: Record<string, any> = {}; // Persistent user stats by name
const gameTimers: Record<string, NodeJS.Timeout> = {};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = 3000;

  const getOrCreateUser = (name: string) => {
    if (!users[name]) {
      users[name] = {
        wins: 0,
        gamesPlayed: 0,
        spyWins: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
      };
    }
    return users[name];
  };

  const tallyVotes = (gameId: string) => {
    const game = games[gameId];
    if (!game || game.status !== 'voting') return;

    if (gameTimers[gameId]) {
      clearInterval(gameTimers[gameId]);
      delete gameTimers[gameId];
    }

    const voteCounts: Record<string, number> = {};
    Object.values(game.votes || {}).forEach((vId: any) => {
      voteCounts[vId] = (voteCounts[vId] || 0) + 1;
    });

    let mostVotedId: string | null = null;
    let maxVotes = -1;
    let isTie = false;

    Object.entries(voteCounts).forEach(([pId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        mostVotedId = pId;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    });

    game.status = 'result';
    if (isTie || !mostVotedId) {
      game.winner = 'spy';
      game.winningReason = 'The agents could not reach a clear consensus. The spies escaped in the confusion!';
    } else if (game.spyIds.includes(mostVotedId)) {
      game.winner = 'agents';
      const spyName = game.players.find((p: any) => p.id === mostVotedId)?.name;
      game.winningReason = `The agents successfully identified a spy: ${spyName}! The network has been compromised.`;
    } else {
      game.winner = 'spy';
      const innocentName = game.players.find((p: any) => p.id === mostVotedId)?.name;
      game.winningReason = `The agents wrongly accused ${innocentName}. The spies used the distraction to complete their mission!`;
    }

    // Update Persistent Stats
    game.players.forEach((p: any) => {
      const user = getOrCreateUser(p.name);
      user.gamesPlayed += 1;
      const isSpy = game.spyIds.includes(p.id);
      if (game.winner === 'agents' && !isSpy) user.wins += 1;
      if (game.winner === 'spy' && isSpy) {
        user.wins += 1;
        user.spyWins += 1;
      }
      // Sync local player object with updated stats for the results screen
      p.stats = { ...user };
    });

    io.to(game.id).emit('gameUpdated', game);
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createGame', (playerName: string) => {
      const gameId = nanoid(6).toUpperCase();
      const user = getOrCreateUser(playerName);
      const game = {
        id: gameId,
        players: [{ 
          id: socket.id, 
          name: playerName, 
          isHost: true,
          avatar: user.avatar,
          stats: { ...user }
        }],
        status: 'lobby',
        locations: CATEGORIES["Metropolis"],
        settings: {
          spyCount: 1,
          votingTime: 60,
          category: "Metropolis",
          mode: "classic"
        },
        spyIds: [],
        votes: {},
        isPaused: false,
      };
      games[gameId] = game;
      socket.join(gameId);
      socket.emit('gameUpdated', game);
    });

    socket.on('updateSettings', ({ gameId, settings }: { gameId: string, settings: any }) => {
      const game = games[gameId];
      if (!game || game.status !== 'lobby' || game.players[0].id !== socket.id) return;
      
      game.settings = settings;
      game.locations = CATEGORIES[settings.category] || CATEGORIES["Metropolis"];
      io.to(gameId).emit('gameUpdated', game);
    });

    socket.on('joinGame', ({ gameId, playerName }: { gameId: string, playerName: string }) => {
      const gId = gameId?.toUpperCase();
      const game = games[gId];
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      if (game.status !== 'lobby') {
        socket.emit('error', 'Game already started');
        return;
      }
      if (game.players.length >= 12) {
        socket.emit('error', 'Game is full');
        return;
      }

      const user = getOrCreateUser(playerName);
      game.players.push({ 
        id: socket.id, 
        name: playerName, 
        isHost: false,
        avatar: user.avatar,
        stats: { ...user }
      });
      socket.join(game.id);
      io.to(game.id).emit('gameUpdated', game);
    });

    socket.on('startGame', (gameId: string) => {
      const game = games[gameId];
      if (!game || game.players[0].id !== socket.id) return;

      if (game.players.length < 3) {
        socket.emit('error', 'Need at least 3 players');
        return;
      }

      const baseLocations = CATEGORIES[game.settings.category] || CATEGORIES["Metropolis"];
      const location = baseLocations[Math.floor(Math.random() * baseLocations.length)];
      
      // Select Spies
      const playerCount = game.players.length;
      const desiredSpyCount = Math.min(game.settings.spyCount, playerCount - 1);
      const shuffledIndices = Array.from({ length: playerCount }, (_, i) => i).sort(() => Math.random() - 0.5);
      const spyIds = shuffledIndices.slice(0, desiredSpyCount).map(idx => game.players[idx].id);

      game.status = 'playing';
      game.location = location;
      game.spyIds = spyIds;
      
      // Mode specific logic
      if (game.settings.mode === 'hardcore') {
        const decoys = ["Area 51", "Secret Island", "The Void", "Bermuda Triangle", "Underworld"]
          .sort(() => Math.random() - 0.5);
        game.locations = [...baseLocations, ...decoys].sort(() => Math.random() - 0.5);
      } else {
        game.locations = [...baseLocations];
      }
      
      if (game.settings.mode === 'speedrun') {
        game.settings.votingTime = 15;
      }

      game.votes = {};
      game.winner = null;
      game.winningReason = null;
      game.isPaused = false;

      io.to(game.id).emit('gameUpdated', game);
    });

    socket.on('startVoting', (gameId: string) => {
      const game = games[gameId];
      if (!game || game.status !== 'playing') return;
      
      game.status = 'voting';
      game.votes = {};
      game.votingTimer = game.settings.votingTime;

      io.to(game.id).emit('gameUpdated', game);

      // Start Countdown
      if (gameTimers[gameId]) clearInterval(gameTimers[gameId]);
      gameTimers[gameId] = setInterval(() => {
        const g = games[gameId];
        if (!g || g.status !== 'voting' || g.isPaused) {
          return;
        }
        g.votingTimer -= 1;
        if (g.votingTimer <= 0) {
          tallyVotes(gameId);
        } else {
          io.to(gameId).emit('gameUpdated', g);
        }
      }, 1000);
    });

    socket.on('pauseGame', (gameId: string) => {
      const game = games[gameId];
      if (!game || !game.players.find((p:any) => p.id === socket.id && p.isHost)) return;
      game.isPaused = true;
      io.to(game.id).emit('gameUpdated', game);
    });

    socket.on('resumeGame', (gameId: string) => {
      const game = games[gameId];
      if (!game || !game.players.find((p:any) => p.id === socket.id && p.isHost)) return;
      game.isPaused = false;
      io.to(game.id).emit('gameUpdated', game);
    });

    socket.on('kickPlayer', ({ gameId, playerId }: { gameId: string, playerId: string }) => {
      const game = games[gameId];
      if (!game || !game.players.find((p:any) => p.id === socket.id && p.isHost)) return;
      
      const playerIndex = game.players.findIndex((p:any) => p.id === playerId);
      if (playerIndex !== -1) {
        const kickedSocket = io.sockets.sockets.get(playerId);
        game.players.splice(playerIndex, 1);
        if (kickedSocket) {
          kickedSocket.leave(gameId);
          kickedSocket.emit('error', 'You have been removed from the session by the director.');
        }
        io.to(game.id).emit('gameUpdated', game);
      }
    });

    socket.on('getLeaderboard', () => {
      const leaderboard = Object.entries(users).map(([name, data]: [string, any]) => ({
        name,
        avatar: data.avatar,
        stats: {
          wins: data.wins,
          gamesPlayed: data.gamesPlayed,
          spyWins: data.spyWins
        }
      })).sort((a, b) => b.stats.wins - a.stats.wins).slice(0, 50);
      
      socket.emit('leaderboardUpdated', leaderboard);
    });

    socket.on('castVote', ({ gameId, targetId }: { gameId: string, targetId: string }) => {
      const game = games[gameId];
      if (!game || game.status !== 'voting') return;

      game.votes[socket.id] = targetId;

      const votedPlayersCount = Object.keys(game.votes).length;
      if (votedPlayersCount === game.players.length) {
        tallyVotes(gameId);
      } else {
        io.to(game.id).emit('gameUpdated', game);
      }
    });

    socket.on('spyGuess', ({ gameId, location }: { gameId: string, location: string }) => {
      const game = games[gameId];
      if (!game || game.status !== 'playing' || !game.spyIds.includes(socket.id)) return;

      const results = game.players.map((p: any) => ({ name: p.name, isSpy: game.spyIds.includes(p.id) }));

      if (location === game.location) {
        game.status = 'result';
        game.winner = 'spy';
        game.winningReason = `Correct guess! The spy identified the location: ${location}.`;
      } else {
        game.status = 'result';
        game.winner = 'agents';
        game.winningReason = `The spy guessed incorrectly (${location}). The actual location was ${game.location}.`;
      }
      io.to(game.id).emit('gameUpdated', game);
    });

    socket.on('resetGame', (gameId: string) => {
      const game = games[gameId];
      if (!game || !game.players.find((p:any) => p.id === socket.id && p.isHost)) return;

      game.status = 'lobby';
      game.location = null;
      game.spyIds = [];
      game.votes = {};
      game.winner = null;
      game.winningReason = null;
      if (gameTimers[gameId]) {
        clearInterval(gameTimers[gameId]);
        delete gameTimers[gameId];
      }
      io.to(game.id).emit('gameUpdated', game);
    });

    socket.on('leaveGame', (gameId: string) => {
      const game = games[gameId];
      if (game) {
        game.players = game.players.filter((p: any) => p.id !== socket.id);
        if (game.players.length === 0) {
          delete games[gameId];
        } else {
          if (game.players.findIndex((p: any) => p.isHost) === -1) {
            game.players[0].isHost = true;
          }
          io.to(game.id).emit('gameUpdated', game);
        }
      }
      socket.leave(gameId);
    });

    socket.on('disconnect', () => {
      // Clean up games
      Object.keys(games).forEach(gameId => {
        const game = games[gameId];
        const playerIndex = game.players.findIndex((p:any) => p.id === socket.id);
        if (playerIndex !== -1) {
          game.players.splice(playerIndex, 1);
          if (game.players.length === 0) {
            delete games[gameId];
          } else {
            if (!game.players.some((p:any) => p.isHost)) {
              game.players[0].isHost = true;
            }
            io.to(game.id).emit('gameUpdated', game);
          }
        }
      });
      console.log('User disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
