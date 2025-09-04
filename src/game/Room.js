class Room {
  constructor(id, io, cfg) {
    this.id = id;
    this.io = io;
    this.cfg = cfg;
    this.players = new Map(); // socketId -> PlayerState
    this._lastSnapshot = 0;
    this._snapshotInterval = 1000 / cfg.SNAPSHOT_RATE;
  }

  addPlayer(socket) {
    this.players.set(socket.id, {
      id: socket.id,
      name: socket.data.name || `Guest-${socket.id.slice(0,5)}`,
      x: Math.random() * (this.cfg.WORLD_WIDTH - 40) + 20,
      y: Math.random() * (this.cfg.WORLD_HEIGHT - 40) + 20,
      vx: 0, vy: 0,
      speed: this.cfg.PLAYER_SPEED,
      lastSeq: 0,
      inputQueue: []
    });
    this.io.to(this.id).emit('system', { type: 'count', count: this.playerCount() });
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.io.to(this.id).emit('system', { type: 'count', count: this.playerCount() });
  }

  playerCount() {
    return this.players.size;
  }

  setPlayerName(socketId, name) {
    const p = this.players.get(socketId);
    if (p) {
      p.name = name;
    }
  }

  isEmpty() {
    return this.players.size === 0;
  }

  enqueueInput(socketId, input) {
    const p = this.players.get(socketId);
    if (!p) return;
    // Basic shape validation
    const safe = {
      seq: Number(input?.seq ?? 0) | 0,
      up: !!input?.up, down: !!input?.down,
      left: !!input?.left, right: !!input?.right,
      dt: Math.max(0, Math.min(0.2, Number(input?.dt ?? 0)))
    };
    p.inputQueue.push(safe);
  }

  update(dt) {
    // Process inputs per player
    for (const p of this.players.values()) {
      while (p.inputQueue.length) {
        const inp = p.inputQueue.shift();
        // Determine velocity from inputs
        let ax = 0, ay = 0;
        if (inp.up) ay -= 1;
        if (inp.down) ay += 1;
        if (inp.left) ax -= 1;
        if (inp.right) ax += 1;

        const len = Math.hypot(ax, ay) || 1;
        p.vx = (ax / len) * p.speed;
        p.vy = (ay / len) * p.speed;

        const step = inp.dt > 0 ? inp.dt : dt;
        p.x += p.vx * step;
        p.y += p.vy * step;

        // clamp to world bounds
        p.x = Math.max(0, Math.min(this.cfg.WORLD_WIDTH, p.x));
        p.y = Math.max(0, Math.min(this.cfg.WORLD_HEIGHT, p.y));

        p.lastSeq = inp.seq | 0;
      }

      // friction if no input
      if (!p.inputQueue.length && p.vx === 0 && p.vy === 0) {
        // nothing
      }
    }

    const now = Date.now();
    if (now - this._lastSnapshot >= this._snapshotInterval) {
      this._lastSnapshot = now;
      this._broadcastSnapshot();
    }
  }

  _broadcastSnapshot() {
    const players = [];
    for (const p of this.players.values()) {
      players.push({
        id: p.id,
        name: p.name,
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
        vx: Math.round(p.vx * 100) / 100,
        vy: Math.round(p.vy * 100) / 100,
        lastSeq: p.lastSeq
      });
    }
    const payload = {
      roomId: this.id,
      t: Date.now(),
      players
    };
    this.io.to(this.id).emit('state', payload);
  }
}

module.exports = { Room };