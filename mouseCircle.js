const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

let mouseX = 0;
let mouseY = 0;

window.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function drawMouseCircle() {
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 12, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function loop() {
  drawMouseCircle();
  requestAnimationFrame(loop);
}

loop();
