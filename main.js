drawHexBackground(ctx, camera.x, camera.y, canvas.width, canvas.height)
import { drawHexBackground } from "./game/background.js"

const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

function resize() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
window.addEventListener("resize", resize)
resize()

let cameraX = 0
let cameraY = 0

function loop() {
  cameraX += 0.3
  cameraY += 0.2

  drawHexBackground(
    ctx,
    cameraX,
    cameraY,
    canvas.width,
    canvas.height
  )

  requestAnimationFrame(loop)
}

loop()
