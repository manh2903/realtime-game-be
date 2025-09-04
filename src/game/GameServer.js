const { v4: uuidv4 } = require('uuid');
const { Room } = require('./Room');
const MESSAGES = require('./messages');

class GameServer {
  constructor(io, cfg) {
    this.io = io;
    this.cfg = cfg;
    this.rooms = new Map();            // roomId -> Room
    this.socketToRoom = new Map();     // socketId -> roomId
    this._tickHandle = null;
    this._lastTickTime = null;
  }

  start() {
    if (this._tickHandle) return;

    this.io.on('connection', (socket) => this._onConnection(socket));

    const tickIntervalMs = 1000 / this.cfg.TICK_RATE;
    this._lastTickTime = Date.now();
    this._tickHandle = setInterval(() => {
      const now = Date.now();
      const dt = (now - this._lastTickTime) / 1000; // seconds
      this._lastTickTime = now;
      this._tick(dt);
    }, tickIntervalMs);

    console.log('[game] GameServer started');
  }

  stop() {
    if (this._tickHandle) {
      clearInterval(this._tickHandle);
      this._tickHandle = null;
    }
    this.io.removeAllListeners('connection');
    console.log('[game] GameServer stopped');
  }

  _onConnection(socket) {
    console.log(`[socket] ${socket.id} connected`);

    socket.on(MESSAGES.CLIENT.HELLO, (payload = {}) => {
      const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 24) : `Guest-${socket.id.slice(0, 5)}`;
      socket.data.name = name;
      socket.emit(MESSAGES.SERVER.HELLO_OK, {
        playerId: socket.id,
        name,
        tickRate: this.cfg.TICK_RATE,
        snapshotRate: this.cfg.SNAPSHOT_RATE,
        world: { width: this.cfg.WORLD_WIDTH, height: this.cfg.WORLD_HEIGHT }
      });
    });

    socket.on(MESSAGES.CLIENT.SET_NAME, (name) => {
      if (typeof name !== 'string' || !name.trim()) return;
      const oldName = socket.data.name;
      const newName = name.trim().slice(0, 24);
      socket.data.name = newName;
      const room = this._roomOf(socket.id);
      if (room) {
        room.setPlayerName(socket.id, newName);
        this.io.to(room.id).emit(MESSAGES.SERVER.SYSTEM, { type: 'rename', playerId: socket.id, oldName, newName });
      }
    });

    socket.on(MESSAGES.CLIENT.JOIN_MATCH, () => {
      const room = this._findOrCreateRoom();
      room.addPlayer(socket);
      this.socketToRoom.set(socket.id, room.id);
      socket.join(room.id);
      socket.emit(MESSAGES.SERVER.JOINED, { roomId: room.id });
      this.io.to(room.id).emit(MESSAGES.SERVER.SYSTEM, { type: 'join', playerId: socket.id, name: socket.data.name });
      console.log(`[room ${room.id}] player ${socket.id} joined (n=${room.playerCount()})`);
    });

    socket.on(MESSAGES.CLIENT.INPUT, (input) => {
      const room = this._roomOf(socket.id);
      if (!room) return;
      room.enqueueInput(socket.id, input);
    });

    socket.on(MESSAGES.CLIENT.CHAT, (message) => {
      if (typeof message !== 'string' || !message.trim()) return;
      const room = this._roomOf(socket.id);
      if (!room) return;
      const payload = {
        senderId: socket.id,
        senderName: socket.data.name,
        message: message.slice(0, 200)
      };
      this.io.to(room.id).emit(MESSAGES.SERVER.CHAT, payload);
    });

    socket.on(MESSAGES.CLIENT.PING, (t) => socket.emit(MESSAGES.SERVER.PONG, t));

    socket.on(MESSAGES.CLIENT.LEAVE, () => this._leave(socket.id));

    socket.on('disconnect', () => this._leave(socket.id));
  }

  _leave(socketId) {
    const room = this._roomOf(socketId);
    if (!room) return;
    room.removePlayer(socketId);
    this.socketToRoom.delete(socketId);
    this.io.to(room.id).emit('system', { type: 'leave', playerId: socketId });
    if (room.isEmpty()) {
      this.rooms.delete(room.id);
      console.log(`[room ${room.id}] deleted (empty)`);
    }
  }

  _findOrCreateRoom() {
    for (const room of this.rooms.values()) {
      if (room.playerCount() < this.cfg.MAX_PLAYERS_PER_ROOM) {
        return room;
      }
    }
    const roomId = uuidv4().slice(0, 8);
    const room = new Room(roomId, this.io, this.cfg);
    this.rooms.set(roomId, room);
    console.log(`[room ${roomId}] created`);
    return room;
  }

  _roomOf(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  _tick(dt) {
    for (const room of this.rooms.values()) {
      room.update(dt);
    }
  }
}

module.exports = { GameServer };