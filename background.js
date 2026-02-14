const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

let zoom = 1;
let targetZoom = 1;



function setSize() {
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
}



const size = 30;
const h = Math.sqrt(3) * size;

let camX = 0;
let camY = 0;

export function setCamera(x, y) {
  camX = x;
  camY = y;
}

let drawAfter = () => {};
export function setAfterDraw(fn) {
  drawAfter = typeof fn === "function" ? fn : () => {};
}

function drawHex(x, y) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = x + size * Math.cos(a);
    const py = y + size * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawGrid() {
  ctx.strokeStyle = "#1f1f1f";
    ctx.lineWidth = 1 / zoom;


  const left = camX - size * 4;
  const top = camY - h * 4;
    const right = camX + window.innerWidth + size * 4;
  const bottom = camY + window.innerHeight + h * 4;


  const yStart = Math.floor(top / h) * h;

  for (let y = yStart; y < bottom; y += h) {
    const row = Math.round(y / h);
    const offset = (row % 2) * size * 1.5;

    const xStart = Math.floor((left - offset) / (size * 3)) * (size * 3) + offset;

    for (let x = xStart; x < right; x += size * 3) {
      drawHex(x, y);
    }
  }
}

export function setZoom(z) {
  targetZoom = 1;
}



function render() {
  const dpr = window.devicePixelRatio || 1;

  // draw in CSS pixels, but use a high-res backing canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, canvas.width, canvas.height);

ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.imageSmoothingEnabled = false;

  const speed = targetZoom < zoom ? 0.08 : 0.025;
  zoom += (targetZoom - zoom) * speed;

  ctx.save();

  // use CSS pixel sizes for all transforms
  ctx.translate(
    window.innerWidth / 2,
    window.innerHeight / 2
  );

 // ctx.scale(zoom, zoom);

  const tx = -camX - window.innerWidth / 2;
const ty = -camY - window.innerHeight / 2;

const snapX = Math.round(tx * zoom) / zoom;
const snapY = Math.round(ty * zoom) / zoom;

ctx.translate(snapX, snapY);


  drawGrid();
  drawAfter(ctx);

  ctx.restore();

  requestAnimationFrame(render);
}


window.addEventListener("resize", () => {
  setSize();
});

setSize();
render();
