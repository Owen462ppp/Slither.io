// bots.js
// Bots that use the SAME trail system as your player snake.
const botRespawnQueue = [];

function rand(a, b) {
  return a + Math.random() * (b - a);
}


function randomBotFoodColor() {
  const colors = ["#ffd24a", "#ff6b6b", "#4dabff", "#9cff57", "#c77dff", "#ff9f1c"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function clampAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}


function dropDeathFoodFromSegments(foods, segments) {
  if (!segments || segments.length === 0) return;

  const step = 2; // bigger = less food
  const jitter = 5;

  for (let i = 0; i < segments.length; i += step) {
    const s = segments[i];
    foods.push({
      x: s.x + (Math.random() * 2 - 1) * jitter,
      y: s.y + (Math.random() * 2 - 1) * jitter,
      color: randomBotFoodColor()
    });
  }
}

function randomColor() {
  const colors = ["#4dabff", "#ff6b6b", "#ffd24a", "#c77dff", "#9cff57", "#ff9f1c"];
  return colors[Math.floor(Math.random() * colors.length)];
}

const BOT_NAMES = [
  "Noah","Liam","Emma","Olivia","Ava","Mason","Logan","Lucas",
  "Ethan","Mia","Sophia","Leo","Jack","Ella","Chloe","Ben",
  "Alex","Ryan","Zoe","Nate","Jade","Kai","Max","Ivy"
];

function randomBotName() {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}


function addTrailPoint(bot) {
  const first = bot.trail[0];

  if (!first) {
    bot.trail.unshift({ x: bot.head.x, y: bot.head.y, dNext: 0 });
    return;
  }

  const dx = bot.head.x - first.x;
  const dy = bot.head.y - first.y;
  const d = Math.hypot(dx, dy);

  if (d < 0.5) return;

  bot.trail.unshift({ x: bot.head.x, y: bot.head.y, dNext: d });
  bot.trailLen += d;

  const need = bot.segmentSpacing * (bot.segmentCount - 1) + 600;
  while (bot.trailLen > need && bot.trail.length > 3) {
    const a = bot.trail[bot.trail.length - 2];
    const b = bot.trail[bot.trail.length - 1];
    bot.trailLen -= Math.hypot(a.x - b.x, a.y - b.y);
    bot.trail.pop();
  }
}

function pointOnTrail(bot, distBack) {
  if (bot.trail.length === 0) return { x: bot.head.x, y: bot.head.y };

  let acc = 0;

  for (let i = 0; i < bot.trail.length - 1; i++) {
    const p = bot.trail[i];
    const n = bot.trail[i + 1];
    const seg = p.dNext || Math.hypot(p.x - n.x, p.y - n.y) || 1;

    if (acc + seg >= distBack) {
      const t = (distBack - acc) / seg;
      return { x: p.x + (n.x - p.x) * t, y: p.y + (n.y - p.y) * t };
    }

    acc += seg;
  }

  const last = bot.trail[bot.trail.length - 1];
  return { x: last.x, y: last.y };
}

function keepInsideCircle(bot, worldRadius) {
  const maxR = worldRadius - 25;
  const d = Math.hypot(bot.head.x, bot.head.y);
  if (d <= maxR || d < 0.001) return;

  const k = maxR / d;
  bot.head.x *= k;
  bot.head.y *= k;

  const centerA = Math.atan2(-bot.head.y, -bot.head.x);
  bot.head.a = centerA;
}

function findNearestFoodIndex(bot, foods, scanRange) {
  const scan2 = scanRange * scanRange;
  let bestI = -1;
  let bestD2 = scan2;

  for (let i = 0; i < foods.length; i++) {
    const f = foods[i];
    const dx = f.x - bot.head.x;
    const dy = f.y - bot.head.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestI = i;
    }
  }

  return bestI;
}

function makeBot(x, y) {
  const segmentCount = 15;


  return {
  name: randomBotName(),
  color: randomColor(),


    head: { x, y, a: Math.random() * Math.PI * 2 },

    segmentCount,
    segmentSpacing: 9,

    snakeRadius: 9,
    minSnakeRadius: 9,
    maxSnakeRadius: 18,

    // same feel as player
    baseSpeed: 0.8,
    minTurnRadius: 50,

    body: Array.from({ length: segmentCount }, () => ({ x, y })),

    trail: [],
    trailLen: 0,

    wanderA: Math.random() * Math.PI * 2,
    wanderTick: Math.floor(Math.random() * 200)
  };
}

export function createBots(count, worldRadius, playerHead) {
  const bots = [];
  const safeRadius = worldRadius * 0.85;

  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * safeRadius;

    const bot = makeBot(
      Math.cos(a) * r,
      Math.sin(a) * r
    );

    keepInsideCircle(bot, worldRadius);
    bots.push(bot);
  }

  return bots;
}


function avoidOtherBots(bot, bots) {
  const avoidRange = 70;          // how far they "see" bodies
  const avoidRange2 = avoidRange * avoidRange;

  let ax = 0;
  let ay = 0;

  for (let j = 0; j < bots.length; j++) {
    const other = bots[j];
    if (other === bot) continue;

    // sample every 2 segments for speed
    for (let i = 0; i < other.body.length; i += 2) {
      const s = other.body[i];

      const dx = bot.head.x - s.x;
      const dy = bot.head.y - s.y;
      const d2 = dx * dx + dy * dy;

      if (d2 > 0.001 && d2 < avoidRange2) {
        const d = Math.sqrt(d2);
        const w = (avoidRange - d) / avoidRange; // 0..1
        ax += (dx / d) * w * w;
        ay += (dy / d) * w * w;
      }
    }
  }

  const len = Math.hypot(ax, ay);
  if (len < 0.001) return null;

  return Math.atan2(ay, ax);
}



function pathIsSafe(bot, bots, angle) {
  const lookSteps = 8;
  const stepSize = 10;

  let x = bot.head.x;
  let y = bot.head.y;

  for (let s = 0; s < lookSteps; s++) {
    x += Math.cos(angle) * stepSize;
    y += Math.sin(angle) * stepSize;

    for (let j = 0; j < bots.length; j++) {
      const other = bots[j];
      if (other === bot) continue;

      for (let i = 0; i < other.body.length; i += 3) {
        const p = other.body[i];
        const dx = x - p.x;
        const dy = y - p.y;

        if (dx * dx + dy * dy < 18 * 18) {
          return false;
        }
      }
    }
  }

  return true;
}
 

function botHitSomething(bot, bots, playerBody) {
  const hitR = bot.snakeRadius * 0.9;
  const hitR2 = hitR * hitR;

  // hit other bots
  for (let j = 0; j < bots.length; j++) {
    const other = bots[j];
    if (other === bot) continue;

    for (let i = 0; i < other.body.length; i++) {
      const s = other.body[i];
      const dx = bot.head.x - s.x;
      const dy = bot.head.y - s.y;

      if (dx * dx + dy * dy <= hitR2) {
        return true;
      }
    }
  }

  // hit player body
  if (playerBody) {
    for (let i = 0; i < playerBody.length; i++) {
      const s = playerBody[i];
      const dx = bot.head.x - s.x;
      const dy = bot.head.y - s.y;

      if (dx * dx + dy * dy <= hitR2) {
        return true;
      }
    }
  }

  return false;
}
function botHeadHitsBody(bot, bots, playerBody) {
  const hitR2 = (bot.snakeRadius * 0.9) ** 2;

  // hit other bot bodies
  for (let j = 0; j < bots.length; j++) {
    const other = bots[j];
    if (other === bot) continue;

    for (let i = 0; i < other.body.length; i++) {
      const s = other.body[i];
      const dx = bot.head.x - s.x;
      const dy = bot.head.y - s.y;

      if (dx * dx + dy * dy <= hitR2) {
        return true;
      }
    }
  }

  // hit player body
  if (playerBody) {
    for (let i = 0; i < playerBody.length; i++) {
      const s = playerBody[i];
      const dx = bot.head.x - s.x;
      const dy = bot.head.y - s.y;

      if (dx * dx + dy * dy <= hitR2) {
        return true;
      }
    }
  }

  return false;
}
function scheduleBotRespawn(worldRadius) {
  const delay = 5000 + Math.random() * 5000; // 5–10 seconds

  botRespawnQueue.push({
    time: performance.now() + delay,
    worldRadius
  });
}
function processBotRespawns(bots) {
  const now = performance.now();

  for (let i = botRespawnQueue.length - 1; i >= 0; i--) {
    const item = botRespawnQueue[i];

    if (now >= item.time) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * item.worldRadius * 0.85;

      const newBot = makeBot(
        Math.cos(a) * r,
        Math.sin(a) * r
      );

      bots.push(newBot);
      botRespawnQueue.splice(i, 1);
    }
  }
}


export function updateBots(bots, foods, worldRadius, playerHead, playerBody) {

  processBotRespawns(bots);

  for (let b = bots.length - 1; b >= 0; b--) {
    const bot = bots[b];
    bot.wanderTick++;

    const borderWarn = worldRadius - 180;
    const dist = Math.hypot(bot.head.x, bot.head.y);

    let targetA = bot.wanderA;

    if (dist > borderWarn) {
      targetA = Math.atan2(-bot.head.y, -bot.head.x);
    } else {
      const fi = findNearestFoodIndex(bot, foods, 700);
      if (fi !== -1) {
        const f = foods[fi];
        targetA = Math.atan2(f.y - bot.head.y, f.x - bot.head.x);
      } else {
        if (bot.wanderTick % 50 === 0) bot.wanderA += rand(-0.8, 0.8);
        targetA = bot.wanderA;
      }
    }

    const avoidA = avoidOtherBots(bot, bots);
    if (avoidA !== null) {
      targetA = clampAngle(
        targetA + clampAngle(avoidA - targetA) * 0.85
      );
    }

    if (playerHead) {
      const dxp = bot.head.x - playerHead.x;
      const dyp = bot.head.y - playerHead.y;
      const dp = Math.hypot(dxp, dyp);
      if (dp < 150 && dp > 0.001) {
        const away = Math.atan2(dyp, dxp);
        targetA = clampAngle(
          targetA + clampAngle(away - targetA) * 0.65
        );
      }
    }

    let da = clampAngle(targetA - bot.head.a);
    const maxTurnRate = bot.baseSpeed / bot.minTurnRadius;
    da = Math.max(-maxTurnRate, Math.min(maxTurnRate, da));
    bot.head.a += da;

    bot.head.x += Math.cos(bot.head.a) * bot.baseSpeed;
    bot.head.y += Math.sin(bot.head.a) * bot.baseSpeed;

    keepInsideCircle(bot, worldRadius);

    if (botHeadHitsBody(bot, bots, playerBody)) {
      dropDeathFoodFromSegments(foods, bot.body);
      scheduleBotRespawn(worldRadius);
      bots.splice(b, 1);
      continue;
    }

    addTrailPoint(bot);

    for (let i = 0; i < bot.body.length; i++) {
      const p = pointOnTrail(bot, i * bot.segmentSpacing);
      bot.body[i].x = p.x;
      bot.body[i].y = p.y;
    }
  }
}

export function botsEatFood(bots, foods, spawnFoodNear, foodRadius) {
  for (let b = 0; b < bots.length; b++) {
    const bot = bots[b];

    const eatR = bot.snakeRadius + foodRadius + 2;
    const eatR2 = eatR * eatR;

    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      const dx = f.x - bot.head.x;
      const dy = f.y - bot.head.y;

      if (dx * dx + dy * dy <= eatR2) {
        foods.splice(i, 1);
        spawnFoodNear(bot.head.x, bot.head.y);

        bot.segmentCount += 1;

        const last = bot.body[bot.body.length - 1] || { x: bot.head.x, y: bot.head.y };
        bot.body.push({ x: last.x, y: last.y });

        bot.snakeRadius = Math.max(
          bot.minSnakeRadius,
          Math.min(bot.maxSnakeRadius, bot.snakeRadius + 0.2)
        );

        break;
      }
    }
  }
}


export function drawBots(ctx, bots) {
  for (let b = 0; b < bots.length; b++) {
    const bot = bots[b];

    // draw body
    for (let i = bot.body.length - 1; i >= 0; i--) {
      const s = bot.body[i];
      ctx.beginPath();
      ctx.arc(s.x, s.y, bot.snakeRadius, 0, Math.PI * 2);
      ctx.fillStyle = bot.color;
      ctx.fill();
    }

    // head + eyes
    const head = bot.head;
    const r = bot.snakeRadius;

    const eyeSide = r * 0.55;
    const eyeBack = r * 0.25;

    const dirX = Math.cos(head.a);
    const dirY = Math.sin(head.a);

    const sideX = Math.cos(head.a + Math.PI / 2);
    const sideY = Math.sin(head.a + Math.PI / 2);

    const eye1x = head.x + dirX * eyeBack + sideX * eyeSide;
    const eye1y = head.y + dirY * eyeBack + sideY * eyeSide;

    const eye2x = head.x + dirX * eyeBack - sideX * eyeSide;
    const eye2y = head.y + dirY * eyeBack - sideY * eyeSide;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eye1x, eye1y, r * 0.32, 0, Math.PI * 2);
    ctx.arc(eye2x, eye2y, r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    const t = performance.now() * 0.001 + b * 2.3;
    let lookX = dirX + Math.cos(t) * 0.3;
    let lookY = dirY + Math.sin(t * 1.4) * 0.3;

    const len = Math.hypot(lookX, lookY) || 1;
    lookX /= len;
    lookY /= len;

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(eye1x + lookX * r * 0.18, eye1y + lookY * r * 0.18, r * 0.11, 0, Math.PI * 2);
    ctx.arc(eye2x + lookX * r * 0.18, eye2y + lookY * r * 0.18, r * 0.11, 0, Math.PI * 2);
    ctx.fill();

    // name above bot
    ctx.save();
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;

    const nameY = head.y - (r + 16);

    ctx.strokeStyle = "#000000";
    ctx.strokeText(bot.name, head.x, nameY);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(bot.name, head.x, nameY);
    ctx.restore();
  }
}
