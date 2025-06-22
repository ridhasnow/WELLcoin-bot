// main.js
let coinCount = 0.0;
let interval;
let countdown = parseInt(localStorage.getItem("countdown")) || 10800;
let lastTimestamp = parseInt(localStorage.getItem("lastTimestamp")) || Date.now();

function updateCoin() {
  coinCount += 0.0000001157;
  document.getElementById("coin-count").textContent = coinCount.toFixed(10);
}

function updateTimer() {
  countdown--;
  localStorage.setItem("countdown", countdown);
  const h = Math.floor(countdown / 3600).toString().padStart(1, '0');
  const m = Math.floor((countdown % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(countdown % 60).toString().padStart(2, '0');
  document.getElementById("countdown").textContent = `${h}:${m}:${s}`;
  if (countdown <= 0) clearInterval(interval);
}

function resumeMining() {
  const now = Date.now();
  const timePassed = Math.floor((now - lastTimestamp) / 1000);
  countdown -= timePassed;
  if (countdown < 0) countdown = 0;
  localStorage.setItem("lastTimestamp", now);
  updateTimer();
  if (countdown > 0) {
    interval = setInterval(() => {
      updateCoin();
      updateTimer();
    }, 1000);
  }
}

function restartMiningTimer() {
  countdown = 10800;
  localStorage.setItem("countdown", countdown);
  localStorage.setItem("lastTimestamp", Date.now());
  clearInterval(interval);
  resumeMining();
}

window.onload = () => {
  resumeMining();
};
