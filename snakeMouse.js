import { setAfterDraw, setCamera, setZoom } from "./background.js";
//import { createBots, updateBots, botsEatFood, drawBots } from "./bots.js";

// gate BEFORE connecting
if (!sessionStorage.getItem("slither_play")) {
  window.location.href = "./lobby.html";
  throw new Error("Not in game");
}

const SERVER_URL =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://slither-server-sntp.onrender.com";

const socket = io(SERVER_URL, {
  transports: ["websocket"],
});


socket.on("connect", () => {
  console.log("socket connected:", socket.id);
});

let myId = null;
let netPlayers = [];
let netFoods = [];

socket.on("you", (data) => {
  myId = data.id;
});

socket.on("state", (s) => {
  netPlayers = s.players || [];
  netFoods = s.foods || [];

  if (typeof s.worldRadius === "number") {
    worldRadius = s.worldRadius;
  }

  syncMyStateFromServer();
});



setInterval(() => {
  console.log("players:", netPlayers.map(p => p.id));
}, 1000);


let zoomEatOffset = 0;

function rand(a, b) {
  return a + Math.random() * (b - a);
}


let zoomEatTarget = 0;

const zoomEatMax = 0.6;
const zoomEatGainPerFood = 0.02;

const zoomEatGainSpeed = 0.0025;
const zoomEatBurnSpeed = 0.002;


let deathFoodDropped = false;
let mx = window.innerWidth / 2;
let my = window.innerHeight / 2;

let boosting = false;

let boostDropTick = 0;
const boostDropEvery = 300; // smaller = more food


window.addEventListener("mousemove", (e) => {
  mx = e.clientX;
  my = e.clientY;
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") boosting = true;
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") boosting = false;
});

window.addEventListener("mousedown", (e) => {
  if (e.button === 0 || e.button === 2) {
    boosting = true;
  }
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0 || e.button === 2) {
    boosting = false;
  }
});

// stop right click menu so right click can boost
window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

const lobbyBtn = document.getElementById("lobbyBtn");
if (lobbyBtn) {
  lobbyBtn.addEventListener("click", () => {
    window.location.href = "./lobby.html";
  });
}

const settings = JSON.parse(localStorage.getItem("slither_settings") || "{}");



const playerName = (settings.name || "Player").trim().slice(0, 16);

const baseWorldRadius = settings.worldRadius || 2000;
let worldRadius = baseWorldRadius;
let targetWorldRadius = baseWorldRadius;

const snakeColor = settings.color || "#39ff88";

// join only after Play
socket.emit("join", { name: playerName, color: snakeColor });

// optional: clear so refresh returns to lobby
sessionStorage.removeItem("slither_play");




//const maxBotCount = 12;
//let nextBotAddAt = performance.now() + rand(5000, 10000);



let dead = false;


//function addBotsOverTime() {
  //if (bots.length >= maxBotCount) return;

  //const now = performance.now();
 // if (now < nextBotAddAt) return;

//  const newOnes = createBots(1, worldRadius, null);
//  if (newOnes && newOnes.length) {
 //   bots.push(newOnes[0]);
 // }

 // nextBotAddAt = now + rand(5000, 10000);
//}




function checkBorderDeath() {
  if (Math.hypot(head.x, head.y) > worldRadius) {
    if (!dead) {
      dead = true;
      if (!deathFoodDropped) {
        deathFoodDropped = true;
        dropDeathFoodFromBody(body);
      }
      showDeathUI();
    }
  }
}



const head = { x: 0, y: 0, a: 0 };

//let bots = createBots(5, worldRadius, head);

//console.log("bots:", bots.length);


const startSegments = 15;
let segmentCount = startSegments;

const segmentSpacing = 9;

const minBodySegments = 10;
const minSnakeRadius = 9;


let snakeRadius = 9;
const maxSnakeRadius = 18;

const normalSnakeRadius = 9;
const boostShrinkRate = 0.002;
const boostLengthLossRate = 0.02;

const minTurnRadius = 50;
const deadZone = 25;

const baseSpeed = 0.8;
const boostSpeed = 1.6;


function showDeathUI() {
  const el = document.getElementById("deathScreen");
  if (!el) return;
  el.style.display = "flex";
}

function hideDeathUI() {
  const el = document.getElementById("deathScreen");
  if (!el) return;
  el.style.display = "none";
}

const playAgainBtn = document.getElementById("playAgainBtn");




//function playerHeadHitsBotBody() {
 // const hitR2 = (snakeRadius * 0.9) ** 2;

  //for (let b = 0; b < bots.length; b++) {
    //const bot = bots[b];
    //for (let i = 0; i < bot.body.length; i++) {
     // const s = bot.body[i];
     // const dx = head.x - s.x;
    //  const dy = head.y - s.y;

    //  if (dx * dx + dy * dy <= hitR2) {
    //   if (!dead) {
      //    dead = true;
      //    if (!deathFoodDropped) {
      //      deathFoodDropped = true;
       //     dropDeathFoodFromBody(body);
      //    }
      //    showDeathUI();
    //    }
    //    return true;
   //   }
 //   }
 // }
  //return false;
//}







function resetGame() {
  dead = false;
  boosting = false;
  deathFoodDropped = false;

  head.x = 0;
  head.y = 0;
  head.a = 0;

  segmentCount = startSegments;
  snakeRadius = normalSnakeRadius;

  body = Array.from({ length: segmentCount }, () => ({ x: head.x, y: head.y }));

  //bots = createBots(5, worldRadius, head);
 // nextBotAddAt = performance.now() + rand(5000, 10000);

  trail.length = 0;
  trailLen = 0;

  //initFood();
  updateCamera();
  hideDeathUI();
}





if (playAgainBtn) playAgainBtn.addEventListener("click", resetGame);





let body = Array.from({ length: segmentCount }, () => ({ x: head.x, y: head.y }));

const trail = [];
let trailLen = 0;

let camX = -window.innerWidth / 2;
let camY = -window.innerHeight / 2;

function updateCamera() {
  camX = head.x - window.innerWidth / 2;
  camY = head.y - window.innerHeight / 2;
  setCamera(camX, camY);
}

/* FOOD */
const foods = [];
const foodCount = 220;
let foodSpawnRadius = 1600;

const foodRadius = 4.5;



function randomFoodColor() {
  const colors = [
    "#ffd24a",
    "#ff6b6b",
    "#4dabff",
    "#9cff57",
    "#c77dff",
    "#ff9f1c"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function dropDeathFoodFromBody(segments) {
  if (!segments || segments.length === 0) return;

  const step = 2; // bigger = less food, try 3 or 4
  const jitter = 5;

  for (let i = 0; i < segments.length; i += step) {
    const s = segments[i];
    foods.push({
      x: s.x + rand(-jitter, jitter),
      y: s.y + rand(-jitter, jitter),
      color: randomFoodColor()
    });
  }
}

function dropBoostFoodAtTail() {
  const tail = body[body.length - 1];
  if (!tail) return;

  const jitter = 6;

  foods.push({
    x: tail.x + rand(-jitter, jitter),
    y: tail.y + rand(-jitter, jitter),
    color: randomFoodColor()
  });
}

function spawnFoodNear(x, y) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * foodSpawnRadius;

  foods.push({
    x: x + Math.cos(a) * r,
    y: y + Math.sin(a) * r,
    color: randomFoodColor()
  });
}


function magnetFood() {
  const magnetRange = 50;
  const magnetStrength = 0.2;

  for (let i = 0; i < foods.length; i++) {
    const f = foods[i];

    const dx = head.x - f.x;
    const dy = head.y - f.y;

    const d = Math.hypot(dx, dy);
    if (d <= 0.001 || d > magnetRange) continue;

    const t = (1 - d / magnetRange);

    const pull = magnetStrength * t * t;

    f.x += (dx / d) * pull * d;
    f.y += (dy / d) * pull * d;
  }
}


function initFood() {
  foods.length = 0;
  for (let i = 0; i < foodCount; i++) spawnFoodNear(head.x, head.y);
}

function keepFoodAroundPlayer() {
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    const dx = f.x - head.x;
    const dy = f.y - head.y;
    if (dx * dx + dy * dy > (foodSpawnRadius * 1.35) * (foodSpawnRadius * 1.35)) {
      foods.splice(i, 1);
      spawnFoodNear(head.x, head.y);
    }
  }
}

function tryEatFood() {
  const eatR = snakeRadius + foodRadius + 2;
  const eatR2 = eatR * eatR;

  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    const dx = f.x - head.x;
    const dy = f.y - head.y;

    if (dx * dx + dy * dy <= eatR2) {
      foods.splice(i, 1);
      spawnFoodNear(head.x, head.y);
      growSnake(1);

      zoomEatTarget = Math.min(zoomEatMax, zoomEatTarget + zoomEatGainPerFood);



      break;
    }
  }
}


function growSnake(segmentsToAdd) {
  segmentCount += segmentsToAdd;

  const last = body[body.length - 1] || { x: head.x, y: head.y };
  for (let i = 0; i < segmentsToAdd; i++) {
    body.push({ x: last.x, y: last.y });
  }

  snakeRadius = Math.max(minSnakeRadius, Math.min(maxSnakeRadius, snakeRadius + 0.2));

}

/* TRAIL */
function addTrailPoint() {
  const first = trail[0];

  if (!first) {
    trail.unshift({ x: head.x, y: head.y, dNext: 0 });
    return;
  }

  const dx = head.x - first.x;
  const dy = head.y - first.y;
  const d = Math.hypot(dx, dy);

  if (d < 0.5) return;

  trail.unshift({ x: head.x, y: head.y, dNext: d });
  trailLen += d;

  const need = segmentSpacing * (segmentCount - 1) + 600;
  while (trailLen > need && trail.length > 3) {
    const a = trail[trail.length - 2];
    const b = trail[trail.length - 1];
    trailLen -= Math.hypot(a.x - b.x, a.y - b.y);
    trail.pop();
  }
}

function pointOnTrail(distBack) {
  if (trail.length === 0) return { x: head.x, y: head.y };

  let acc = 0;

  for (let i = 0; i < trail.length - 1; i++) {
    const p = trail[i];
    const n = trail[i + 1];
    const seg = p.dNext || Math.hypot(p.x - n.x, p.y - n.y) || 1;

    if (acc + seg >= distBack) {
      const t = (distBack - acc) / seg;
      return { x: p.x + (n.x - p.x) * t, y: p.y + (n.y - p.y) * t };
    }

    acc += seg;
  }

  const last = trail[trail.length - 1];
  return { x: last.x, y: last.y };
}

/* MOVE */
function stepHead() {
  const atMinSize =
  body.length <= minBodySegments && snakeRadius <= minSnakeRadius;

const speed = boosting && !atMinSize ? boostSpeed : baseSpeed;


  if (boosting && !atMinSize) {
  if (snakeRadius > minSnakeRadius) {
    snakeRadius = Math.max(minSnakeRadius, snakeRadius - boostShrinkRate);
  }

  // drop food behind you while boosting
  boostDropTick++;
  if (boostDropTick >= boostDropEvery) {
    boostDropTick = 0;
    dropBoostFoodAtTail();
  }

  // keep your current length-loss behavior
  if (Math.random() < boostLengthLossRate && body.length > minBodySegments) {
    body.pop();
    segmentCount--;
  }
} else {
  boostDropTick = 0;
}





  const mouseWorldX = camX + mx;
  const mouseWorldY = camY + my;

  const dx = mouseWorldX - head.x;
  const dy = mouseWorldY - head.y;

  const dist = Math.hypot(dx, dy);

  if (dist >= deadZone) {
    const targetA = Math.atan2(dy, dx);

    let da = targetA - head.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;

    const maxTurnRate = speed / minTurnRadius;

    if (da > maxTurnRate) da = maxTurnRate;
    if (da < -maxTurnRate) da = -maxTurnRate;

    head.a += da;
  }

  head.x += Math.cos(head.a) * speed;
  head.y += Math.sin(head.a) * speed;
}


function stepBody() {
  addTrailPoint();

  for (let i = 0; i < body.length; i++) {
    const p = pointOnTrail(i * segmentSpacing);
    body[i].x = p.x;
    body[i].y = p.y;
  }
}

/* DRAW */
function drawFood(ctx) {
  for (let i = 0; i < netFoods.length; i++) {
    const f = netFoods[i];
    ctx.beginPath();
    ctx.arc(f.x, f.y, foodRadius, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();
  }
}


function drawBorder(ctx) {
  ctx.beginPath();
  ctx.arc(0, 0, worldRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#ff3b3b";
  ctx.lineWidth = 6;
  ctx.stroke();
}




function drawOutsideRedShade(ctx) {
  ctx.save();

  // cover entire world
  ctx.fillStyle = "rgba(255, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.rect(
    camX,
    camY,
    window.innerWidth,
    window.innerHeight
  );

  // cut out the safe circle
  ctx.arc(0, 0, worldRadius, 0, Math.PI * 2, true);
  ctx.fill("evenodd");

  ctx.restore();
}


function drawBoostOutline(ctx) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;

  for (let i = body.length - 1; i >= 0; i--) {
    const s = body[i];
    ctx.beginPath();
    ctx.arc(s.x, s.y, snakeRadius + 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}


function drawSnake(ctx) {
  for (let i = body.length - 1; i >= 0; i--) {
    const s = body[i];
    ctx.beginPath();
    ctx.arc(s.x, s.y, snakeRadius, 0, Math.PI * 2);
    ctx.fillStyle = snakeColor;
    ctx.fill();
  }

  // eye placement
const eyeSide = snakeRadius * 0.55;
const eyeBack = snakeRadius * 0.25;

// base direction vectors
const dirX = Math.cos(head.a);
const dirY = Math.sin(head.a);

const sideX = Math.cos(head.a + Math.PI / 2);
const sideY = Math.sin(head.a + Math.PI / 2);

// eye centers (pushed back into head)
const eye1x = head.x + dirX * eyeBack + sideX * eyeSide;
const eye1y = head.y + dirY * eyeBack + sideY * eyeSide;

const eye2x = head.x + dirX * eyeBack - sideX * eyeSide;
const eye2y = head.y + dirY * eyeBack - sideY * eyeSide;

// draw white eyes
ctx.fillStyle = "#ffffff";
ctx.beginPath();
ctx.arc(eye1x, eye1y, snakeRadius * 0.32, 0, Math.PI * 2);
ctx.arc(eye2x, eye2y, snakeRadius * 0.32, 0, Math.PI * 2);
ctx.fill();

// mouse look direction
const mouseWorldX = camX + mx;
const mouseWorldY = camY + my;

const lookDX = mouseWorldX - head.x;
const lookDY = mouseWorldY - head.y;
const lookD = Math.hypot(lookDX, lookDY) || 1;

const lookX = lookDX / lookD;
const lookY = lookDY / lookD;

// pupil offset
const pupilOffset = snakeRadius * 0.14;

// draw pupils
ctx.fillStyle = "#000000";
ctx.beginPath();
ctx.arc(
  eye1x + lookX * pupilOffset,
  eye1y + lookY * pupilOffset,
  snakeRadius * 0.11,
  0,
  Math.PI * 2
);
ctx.arc(
  eye2x + lookX * pupilOffset,
  eye2y + lookY * pupilOffset,
  snakeRadius * 0.11,
  0,
  Math.PI * 2
);
ctx.fill();
  // player name above head
  ctx.save();

  const nameY = head.y - (snakeRadius + 16);

  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // outline for readability
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000000";
  ctx.strokeText(playerName, head.x, nameY);

  // text
  ctx.fillStyle = "#ffffff";
  ctx.fillText(playerName, head.x, nameY);

  ctx.restore();


}
function getAliveCount() {
  return netPlayers.length;
}

function updateWorldRadius() {
  const players = getAliveCount();

  const minR = baseWorldRadius * 0.75;
  const maxR = baseWorldRadius * 1.6;

  const addPerPlayer = baseWorldRadius * 0.08;

  targetWorldRadius = baseWorldRadius + (players - 1) * addPerPlayer;
  targetWorldRadius = Math.max(minR, Math.min(maxR, targetWorldRadius));

  const smooth = 0.02;
  worldRadius += (targetWorldRadius - worldRadius) * smooth;

  foodSpawnRadius = worldRadius * 0.8;
}


function drawOneSnake(ctx, p) {
  const r = p.snakeRadius || 9;
  const bodyArr = p.body || [];

  for (let i = bodyArr.length - 1; i >= 0; i--) {
    const s = bodyArr[i];
    ctx.beginPath();
   const x = Math.round(s.x);
const y = Math.round(s.y);
ctx.arc(x, y, r, 0, Math.PI * 2);

    ctx.fillStyle = p.color || "#ffffff";
    ctx.fill();
  }

 const hx = Math.round(p.head?.x ?? (bodyArr[0]?.x ?? 0));
const hy = Math.round(p.head?.y ?? (bodyArr[0]?.y ?? 0));


  ctx.save();
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;

  const nameY = hy - (r + 16);

  ctx.strokeStyle = "#000000";
  ctx.strokeText(p.name || "Player", hx, nameY);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(p.name || "Player", hx, nameY);
  ctx.restore();
}

function drawNetSnakes(ctx) {
  for (const p of netPlayers) {
    if (!p) continue;
    if (p.id === myId) continue;
    drawOneSnake(ctx, p);
  }
}




function sendInputToServer() {
  if (!myId) return;

  const mouseWorldX = camX + mx;
  const mouseWorldY = camY + my;

  const dx = mouseWorldX - head.x;
  const dy = mouseWorldY - head.y;

  const a = Math.atan2(dy, dx);

  socket.emit("input", { a, boosting });
}

function getMyNetLength() {
  const me = netPlayers.find(p => p.id === myId);
  return me?.body?.length || 15;
}
function syncMySizeFromServer() {
  const me = netPlayers.find(p => p && p.id === myId);
  if (!me) return;

  const targetLen = me.body?.length || startSegments;

  while (body.length < targetLen) {
    const last = body[body.length - 1] || { x: head.x, y: head.y };
    body.push({ x: last.x, y: last.y });
    segmentCount++;
  }

  while (body.length > targetLen) {
    body.pop();
    segmentCount--;
  }

  if (typeof me.snakeRadius === "number") {
    snakeRadius += (me.snakeRadius - snakeRadius) * 0.35;
  }
}

function syncMyStateFromServer() {
  const me = netPlayers.find(p => p && p.id === myId);
  if (!me) return;

  // snap your head to the server
  if (me.head) {
    head.x = me.head.x;
    head.y = me.head.y;
    head.a = me.head.a;
  }

  // match your body positions to the server
  if (Array.isArray(me.body) && me.body.length) {
    body = me.body.map(s => ({ x: s.x, y: s.y }));
    segmentCount = body.length;
  }

  // match radius from server
  if (typeof me.snakeRadius === "number") {
    snakeRadius = me.snakeRadius;
  }
}

function tick(ctx) {
  // move your snake locally
  if (!dead) {
    stepHead();
    stepBody();
  

  }

  // send your input to server
  sendInputToServer();

  // camera follows your local snake
  updateCamera();

  if (!dead) {
    checkBorderDeath();
  }

  const myLen = body.length || 15;
  setZoom(
    Math.max(
      1.1,
      1.6 - myLen * 0.002
    )
  );
drawOutsideRedShade(ctx);
drawFood(ctx);
drawBorder(ctx);


  // draw other players from server
  drawNetSnakes(ctx);

  // draw YOU from local state last
  drawSnake(ctx);
}








//initFood();

setAfterDraw(tick);
