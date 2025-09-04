# Realtime Game Backend (Node.js + Socket.IO)

Một bộ khởi tạo (starter) BE Node.js **realtime** cho game nhỏ (matchmaking theo phòng, tick loop, broadcast snapshot). Có kèm client demo để test nhanh.

## Tính năng
- Express + Socket.IO, CORS cấu hình được.
- Matchmaking tự động: gom người chơi vào phòng (tối đa `MAX_PLAYERS_PER_ROOM`).
- Vòng lặp logic (tick) và phát trạng thái (snapshot) cấu hình bằng env.
- Xử lý input đơn giản (WASD/arrow) -> cập nhật vị trí, giới hạn biên thế giới.
- Sự kiện socket chuẩn hoá: `hello`, `join_match`, `input`, `state`, `system`, `ping/pong`.
- Demo client tĩnh tại `/public` để thử ngay.

## Chạy local
```bash
# 1) Cài deps
npm install

# 2) Chạy dev (hot reload với nodemon)
npm run dev

# Hoặc chạy production
npm start
```

Mặc định server chạy tại `http://localhost:3000` và phục vụ demo client ở `/`.

## Cấu hình (ENV)
Tạo file `.env` (xem `.env.example`):
```
PORT=3000
TICK_RATE=30
SNAPSHOT_RATE=15
MAX_PLAYERS_PER_ROOM=8
WORLD_WIDTH=1000
WORLD_HEIGHT=600
PLAYER_SPEED=220
# CORS_ORIGINS=http://localhost:5173,https://yourgame.com
```

## Các sự kiện Socket
### Client -> Server
- `hello` `{ name?: string }` → trả về `hello_ok`.
- `join_match` → vào phòng phù hợp, trả về `joined { roomId }`.
- `input` `{ seq, up, down, left, right, dt }` → hàng đợi input.
- `ping` → server trả `pong` cùng timestamp để đo ping.
- `leave` → rời phòng.

### Server -> Client
- `hello_ok` `{ playerId, name, tickRate, snapshotRate, world }`
- `joined` `{ roomId }`
- `state` `{ roomId, t, players: [{ id, name, x, y, vx, vy, lastSeq }] }`
- `system` ví dụ `{ type: 'join'|'leave'|'count', ... }`
- `pong` echo timestamp

## Kiến trúc code
- `src/server.js` khởi tạo HTTP + Socket.IO và `GameServer`.
- `src/game/GameServer.js` quản lý phòng, vòng lặp tick toàn cục.
- `src/game/Room.js` mô phỏng đơn giản, gom & áp dụng input, phát snapshot.
- `public/index.html` client demo để bạn test nhanh.

## Triển khai Docker
```bash
docker build -t realtime-game-be .
docker run -p 3000:3000 --env-file .env realtime-game-be
```

## Mở rộng tiếp theo
- Thêm xác thực (JWT) & phân quyền.
- Đồng bộ hoá trạng thái nâng cao: server reconciliation, lag compensation.
- Chống gian lận: validate vị trí, rate-limit input.
- Persistence: Redis (pub/sub, session), lưu lịch sử trận.
- Scale ngang: Socket.IO adapter (Redis) + nhiều instance + load balancer.
- Metrics/observability: Prometheus, OpenTelemetry, logs chuẩn.
```