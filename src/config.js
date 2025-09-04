const loadConfig = () => {
  const asInt = (v, d) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
  };
  const asFloat = (v, d) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : d;
  };
  const asList = (v) => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []);

  return {
    PORT: asInt(process.env.PORT, 3000),
    TICK_RATE: asInt(process.env.TICK_RATE, 30),          // logic updates per second
    SNAPSHOT_RATE: asInt(process.env.SNAPSHOT_RATE, 15),  // state broadcasts per second
    MAX_PLAYERS_PER_ROOM: asInt(process.env.MAX_PLAYERS_PER_ROOM, 8),
    WORLD_WIDTH: asInt(process.env.WORLD_WIDTH, 1000),
    WORLD_HEIGHT: asInt(process.env.WORLD_HEIGHT, 600),
    PLAYER_SPEED: asFloat(process.env.PLAYER_SPEED, 220), // units/second
    CORS_ORIGINS: asList(process.env.CORS_ORIGINS)        // e.g. "http://localhost:5173,https://mygame.com"
  };
};

module.exports = { loadConfig };