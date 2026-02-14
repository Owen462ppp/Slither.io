const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://slither-frontend-kmhl.onrender.com",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ],
    methods: ["GET", "POST"]
  }
});


const PORT = process.env.PORT || 3000;


const CLIENT_DIR = path.join(__dirname, "..");
app.use(express.static(CLIENT_DIR));

const WORLD_RADIUS = 2000;



const START_SEGMENTS = 15;
const SEGMENT_SPACING = 9;

const SNAKE_RADIUS = 9;


const TICK_RATE = 60;
const BASE_SPEED = 3;
const BOOST_SPEED = 6;
const MIN_TURN_RADIUS = 50;



const players = new Map();
// ===== FOOD SYSTEM =====
const FOOD_COUNT = 220;
const FOOD_RADIUS = 4.5;
const FOOD_SPAWN_RADIUS = WORLD_RADIUS * 0.85;

const foods = [];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function randomFoodColor() {
  const colors = ["#ffd24a", "#ff6b6b", "#4dabff", "#9cff57", "#c77dff", "#ff9f1c"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function spawnFoodOne() {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * FOOD_SPAWN_RADIUS;
  return {
    x: Math.cos(a) * r,
    y: Math.sin(a) * r,
    color: randomFoodColor()
  };
}

for (let i = 0; i < FOOD_COUNT; i++) {
  foods.push(spawnFoodOne());
}

function clampAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function keepInsideCircle(p) {
  const maxR = WORLD_RADIUS - 25;
  const d = Math.hypot(p.head.x, p.head.y);
  if (d <= maxR || d < 0.001) return;

  const k = maxR / d;
  p.head.x *= k;
  p.head.y *= k;

  // turn inward a bit
  p.head.a = Math.atan2(-p.head.y, -p.head.x);
}

function addTrailPoint(p) {
  const first = p.trail[0];

  if (!first) {
    p.trail.unshift({ x: p.head.x, y: p.head.y, dNext: 0 });
    return;
  }

  const dx = p.head.x - first.x;
  const dy = p.head.y - first.y;
  const d = Math.hypot(dx, dy);

  if (d < 0.5) return;

  p.trail.unshift({ x: p.head.x, y: p.head.y, dNext: d });
  p.trailLen += d;

  const need = SEGMENT_SPACING * (p.segmentCount - 1) + 600;

  while (p.trailLen > need && p.trail.length > 3) {
    const a = p.trail[p.trail.length - 2];
    const b = p.trail[p.trail.length - 1];
    p.trailLen -= Math.hypot(a.x - b.x, a.y - b.y);
    p.trail.pop();
  }
}

function pointOnTrail(p, distBack) {
  if (p.trail.length === 0) return { x: p.head.x, y: p.head.y };

  let acc = 0;

  for (let i = 0; i < p.trail.length - 1; i++) {
    const cur = p.trail[i];
    const nxt = p.trail[i + 1];
    const seg = cur.dNext || Math.hypot(cur.x - nxt.x, cur.y - nxt.y) || 1;

    if (acc + seg >= distBack) {
      const t = (distBack - acc) / seg;
      return { x: cur.x + (nxt.x - cur.x) * t, y: cur.y + (nxt.y - cur.y) * t };
    }

    acc += seg;
  }

  const last = p.trail[p.trail.length - 1];
  return { x: last.x, y: last.y };
}

function rebuildBodyFromTrail(p) {
  for (let i = 0; i < p.body.length; i++) {
    const pos = pointOnTrail(p, i * SEGMENT_SPACING);
    p.body[i].x = pos.x;
    p.body[i].y = pos.y;
  }
}

function seedTrailForSpawn(p) {
  const dirX = Math.cos(p.head.a);
  const dirY = Math.sin(p.head.a);

  const spacing = SEGMENT_SPACING;

  // total trail length needed so every segment can sit on the trail right away
  const lengthNeeded = spacing * (p.segmentCount - 1) + 80;
  const steps = Math.ceil(lengthNeeded / spacing);

  p.trail = [];
  p.trailLen = 0;

  // build trail so trail[0] is closest to the head (newest point)
  for (let i = 0; i <= steps; i++) {
    const dist = i * spacing;

    const x = p.head.x - dirX * dist;
    const y = p.head.y - dirY * dist;

    p.trail.unshift({
      x,
      y,
      dNext: i === 0 ? 0 : spacing
    });

    if (i > 0) p.trailLen += spacing;
  }

  rebuildBodyFromTrail(p);
}




io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join", ({ name, color }) => {
    const safeName = String(name || "Player").slice(0, 16);
    const safeColor = String(color || "#39ff88");

    const ang = Math.random() * Math.PI * 2;
const rad = 600 + Math.random() * 400; // 600 to 1000 from center
const x = Math.cos(ang) * rad;
const y = Math.sin(ang) * rad;


   const a0 = Math.random() * Math.PI * 2;

const head = { x, y, a: a0 };

const body = Array.from({ length: START_SEGMENTS }, (_, i) => ({
  x: x - Math.cos(a0) * i * SEGMENT_SPACING,
  y: y - Math.sin(a0) * i * SEGMENT_SPACING
}));

const p = {
  id: socket.id,
  name: safeName,
  color: safeColor,

  head,
  inputA: a0,
  boosting: false,

  segmentCount: START_SEGMENTS,
  snakeRadius: SNAKE_RADIUS,

  body,

  trail: [],
  trailLen: 0
};


seedTrailForSpawn(p);


    players.set(socket.id, p);

    socket.emit("you", { id: socket.id });
  });

  socket.on("input", ({ a, boosting }) => {
    const p = players.get(socket.id);
    if (!p) return;

    if (typeof a === "number") p.inputA = clampAngle(a);
    p.boosting = !!boosting;
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    players.delete(socket.id);
  });
});

setInterval(() => {
  for (const p of players.values()) {
    const speed = p.boosting ? BOOST_SPEED : BASE_SPEED;

    const targetA = p.inputA;
    let da = clampAngle(targetA - p.head.a);

    const maxTurnRate = speed / MIN_TURN_RADIUS;
    if (da > maxTurnRate) da = maxTurnRate;
    if (da < -maxTurnRate) da = -maxTurnRate;

    p.head.a = clampAngle(p.head.a + da);

    p.head.x += Math.cos(p.head.a) * speed;
    p.head.y += Math.sin(p.head.a) * speed;

    keepInsideCircle(p);

    addTrailPoint(p);
    rebuildBodyFromTrail(p);

    // ===== FOOD EAT (SERVER AUTH) =====
    const eatR = p.snakeRadius + FOOD_RADIUS + 2;
    const eatR2 = eatR * eatR;

    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      const dx = f.x - p.head.x;
      const dy = f.y - p.head.y;

      if (dx * dx + dy * dy <= eatR2) {
        foods[i] = spawnFoodOne();

        p.segmentCount += 1;
        const last = p.body[p.body.length - 1] || { x: p.head.x, y: p.head.y };
        p.body.push({ x: last.x, y: last.y });

        p.snakeRadius = Math.min(18, p.snakeRadius + 0.2);

        break;
      }
    }
  }

  io.emit("state", {
    worldRadius: WORLD_RADIUS,
    foods,
    players: Array.from(players.values()).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      head: p.head,
      snakeRadius: p.snakeRadius,
      body: p.body
    }))
  });
}, Math.floor(1000 / TICK_RATE));


server.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
