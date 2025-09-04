require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { GameServer } = require('./game/GameServer');
const { loadConfig } = require('./config');

const cfg = loadConfig();

const app = express();
app.use(cors({ origin: cfg.CORS_ORIGINS.length ? cfg.CORS_ORIGINS : true }));
app.use(express.json());

// Demo client to try things quickly (optional)
app.use(express.static(require('path').join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: cfg.CORS_ORIGINS.length ? cfg.CORS_ORIGINS : true }
});

const gameServer = new GameServer(io, cfg);
gameServer.start();

const PORT = cfg.PORT;
httpServer.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  console.log(`[server] TickRate=${cfg.TICK_RATE}Hz SnapshotRate=${cfg.SNAPSHOT_RATE}Hz MaxPlayers=${cfg.MAX_PLAYERS_PER_ROOM}`);
});