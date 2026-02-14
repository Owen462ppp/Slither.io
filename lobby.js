const nameEl = document.getElementById("name");
const colorEl = document.getElementById("color");
const radiusEl = document.getElementById("radius");
const playBtn = document.getElementById("play");

const saved = JSON.parse(localStorage.getItem("slither_settings") || "{}");

if (saved.name) nameEl.value = saved.name;
if (saved.color) colorEl.value = saved.color;
if (saved.worldRadius) radiusEl.value = String(saved.worldRadius);

playBtn.addEventListener("click", () => {
  const settings = {
    name: nameEl.value.trim() || "Player",
    color: colorEl.value,
    worldRadius: Number(radiusEl.value)
  };

  localStorage.setItem("slither_settings", JSON.stringify(settings));

// ADD THIS LINE
sessionStorage.setItem("slither_play", "1");

window.location.href = "./index.html";

});
