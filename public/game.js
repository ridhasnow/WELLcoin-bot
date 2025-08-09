// --- منع الزوم والسكرول ---
document.addEventListener('touchmove', function(event) {
  if (event.scale !== 1) { event.preventDefault(); }
}, { passive: false });
document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });
window.addEventListener('keydown', function(e) {
  if(["ArrowLeft", "ArrowRight", " "].includes(e.key)) { e.preventDefault(); }
}, { passive: false });
window.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
window.addEventListener('scroll', function() { window.scrollTo(0, 0); });
document.body.style.overflow = "hidden";
document.documentElement.style.overflow = "hidden";

// -------------- Firebase & Telegram --------------
const app = firebase.initializeApp({
  apiKey: "AIzaSyB9uNwUURvf5RsD7CnsG2LtE6fz5yboBkw",
  authDomain: "wellcoinbotgame.firebaseapp.com",
  databaseURL: "https://wellcoinbotgame-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wellcoinbotgame",
  storageBucket: "wellcoinbotgame.appspot.com",
  messagingSenderId: "108640533638",
  appId: "1:108640533638:web:ed07516d96ac38f47f6507"
});
const db = firebase.database(app);
const tg = window.Telegram.WebApp;
tg.ready();
const userId = tg.initDataUnsafe?.user?.id;
const usernameBox = document.getElementById("username-inside");
const balanceDisplay = document.getElementById("balance-amount");

let balance = 0;
let energyTaps = 300;
let maxTaps = 300;
let tapValue = 0.0000000001;
let replenishInterval = null;
let tapReplenishTime = 20000;
let tapCooldown = 6000;
let lastSentBalance = 0;
let tapTimeoutId = null;
let lastEnergyTapsDB = 0;
let lastEnergySaveTime = 0;

const energyBarContainer = document.getElementById("energy-bar-container");
const energyBarInner = document.getElementById("energy-bar-inner");
const energyBarLabel = document.getElementById("energy-bar-label");
const tapCharacter = document.getElementById("tap-character");

// ====== SHOP ICONS & CHARACTER IMAGE LOGIC ======

// Floating products configuration (same order as shop.js)
const FLOATING_PRODUCTS = [
  // id, image, mining, displayName
  { id: "shop",       img: "assets/shop.jpg",      mining: 0.000007, displayName: "Business Property" },
  { id: "bmwcar",     img: "assets/bmwcar.jpg",    mining: 0.000009, displayName: "BMW Car" },
  { id: "yacht",      img: "assets/yacht.jpg",     mining: 0.000060, displayName: "Yacht" },
  { id: "helicopter", img: "assets/helicopter.jpg",mining: 0.000073, displayName: "Helicopter" },
];

const CHARACTER_PRODUCTS = [
  // index matches shop.js: suit, house, fitness, computer, iphone15, gangsterhat, royalthrone, wife, clock, pitbull, ak, bodyguards, palace
  { id: "suit",        img: "assets/character1.png" },
  { id: "house",       img: "assets/character2.png" },
  { id: "fitness",     img: "assets/character3.png" },
  { id: "computer",    img: "assets/character4.png" },
  { id: "iphone15",    img: "assets/character5.png" },
  { id: "gangsterhat", img: "assets/character6.png" },
  { id: "royalthrone", img: "assets/character7.png" },
  { id: "wife",        img: "assets/character8.png" },
  { id: "clock",       img: "assets/character9.png" },
  { id: "pitbull",     img: "assets/character10.png" },
  { id: "ak",          img: "assets/character11.png" },
  { id: "bodyguards",  img: "assets/character12.png" },
  { id: "palace",      img: "assets/character13.png" }
];

// ========== ENERGY/BALANCE FUNCTIONS ==========
function saveEnergyToDB() {
  db.ref("users/" + userId).update({ energyTaps: energyTaps, lastEnergySaveTime: Date.now() });
  lastEnergyTapsDB = energyTaps;
  lastEnergySaveTime = Date.now();
}

// --- حل فقدان الرصيد عند الخروج المفاجئ: حفظ الرصيد دائمًا في كل نقرة وليس فقط عند الخمول أو الخروج
function sendBalanceToDB() {
  if (balance !== lastSentBalance) {
    db.ref("users/" + userId).update({ balance: balance });
    lastSentBalance = balance;
  }
}

window.addEventListener("load", () => {
  if (!userId) {
    window.location.href = "welcome.html";
    return;
  }
  const userRef = db.ref("users/" + userId);
  userRef.once("value").then((snapshot) => {
    if (!snapshot.exists()) {
      window.location.href = "welcome.html";
      return;
    }
    const userData = snapshot.val();
    usernameBox.textContent = userData.username || "Unknown Player";
    balance = parseFloat(userData.balance || 0);
    lastSentBalance = balance;
    // استرجاع الطاقة مع الوقت
    if (userData.energyTaps !== undefined && userData.lastEnergySaveTime !== undefined) {
      let prevTaps = parseInt(userData.energyTaps);
      let prevSave = parseInt(userData.lastEnergySaveTime);
      let now = Date.now();
      let tapsRecovered = Math.floor((now - prevSave) / tapReplenishTime);
      let tapsNow = Math.min(maxTaps, prevTaps + tapsRecovered);
      energyTaps = tapsNow;
      lastEnergyTapsDB = energyTaps;
      lastEnergySaveTime = prevSave + tapsRecovered * tapReplenishTime;
      if (energyTaps < maxTaps) saveEnergyToDB();
    } else {
      energyTaps = maxTaps;
      saveEnergyToDB();
    }
    updateBalanceDisplay();
    updateEnergyBar();
    startEnergyReplenish();
    setupShopLogic(); // <-- IMPORTANT: Initialize shop icons & character logic after load
  });
});

function startEnergyReplenish() {
  if (replenishInterval) clearInterval(replenishInterval);
  replenishInterval = setInterval(() => {
    if (energyTaps < maxTaps) {
      energyTaps += 1;
      updateEnergyBar();
      saveEnergyToDB();
    }
  }, tapReplenishTime);
}

function updateEnergyBar() {
  let percentage = energyTaps / maxTaps;
  let low = percentage < 0.23;
  energyBarInner.classList.toggle('low', low);
  energyBarInner.style.width = (percentage * 100) + "%";
  energyBarLabel.textContent = `${energyTaps}/${maxTaps} Taps`;
  let barWidth = energyBarContainer.offsetWidth || 1;
  let led = energyBarInner.querySelector('.energy-bar-led');
  if (led) {
    led.style.right = (energyTaps === 0 ? barWidth - 18 : 0) + "px";
    led.style.opacity = percentage > 0.07 ? 0.77 : 0.16;
    led.style.background = low
      ? "radial-gradient(circle, #ff4c3b 85%, #fff0 100%)"
      : "radial-gradient(circle, #fff 85%, #3baaff 100%)";
  }
}

function updateBalanceDisplay() {
  balanceDisplay.textContent = balance.toFixed(10);
}

function vibrate(ms = 10) {
  if (window.navigator?.vibrate) window.navigator.vibrate(ms);
}

// دخان واقعي و+1 واضحة جدا
function showTapEffect(x, y) {
  const tapEl = document.createElement("div");
  tapEl.className = "tap-effect";
  tapEl.style.left = `${x - 35}px`;
  tapEl.style.top = `${y - 35}px`;
  tapEl.innerHTML = `
    <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
      <ellipse cx="35" cy="44" rx="16" ry="7" fill="url(#smokeGrad)" opacity="0.20"/>
      <ellipse cx="35" cy="27" rx="17" ry="8" fill="url(#smokeGrad2)" opacity="0.15"/>
      <ellipse cx="35" cy="38" rx="19" ry="13" fill="url(#smokeGrad3)" opacity="0.16"/>
      <defs>
        <radialGradient id="smokeGrad" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%" stop-color="#fff"/>
          <stop offset="60%" stop-color="#fff" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="smokeGrad2" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%" stop-color="#fff"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="smokeGrad3" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%" stop-color="#fff"/>
          <stop offset="65%" stop-color="#fff" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>
    </svg>
  `;
  document.body.appendChild(tapEl);

  // +1 واضحة جدا فوق الدخان
  const plus = document.createElement("div");
  plus.className = "tap-plus";
  plus.innerHTML = "+1";
  tapEl.appendChild(plus);

  setTimeout(() => tapEl.remove(), 1000);
}

tapCharacter.addEventListener("pointerdown", function(e) {
  if (energyTaps <= 0) return;
  let rect = tapCharacter.getBoundingClientRect();
  let x = (e.touches ? e.touches[0].clientX : e.clientX);
  let y = (e.touches ? e.touches[0].clientY : e.clientY);
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
  showTapEffect(x, y);
  vibrate(7);
  tapCharacter.style.transform = "scale(0.99) rotate(" + (Math.random()*0.7-0.35) + "deg)";
  setTimeout(() => { tapCharacter.style.transform = ""; }, 45);
  energyTaps -= 1;
  balance += tapValue;
  updateBalanceDisplay();
  updateEnergyBar();
  saveEnergyToDB();
  sendBalanceToDB();
});

// حفظ الرصيد والطاقة عند الخروج
window.addEventListener("beforeunload", function() {
  sendBalanceToDB();
  saveEnergyToDB();
});

// شحن الطاقة التلقائي
function startEnergyReplenish() {
  if (replenishInterval) clearInterval(replenishInterval);
  replenishInterval = setInterval(() => {
    if (energyTaps < maxTaps) {
      energyTaps += 1;
      updateEnergyBar();
      saveEnergyToDB();
    }
  }, tapReplenishTime);
}

// زر اللعب ونافذة الكول داون كما هي
function msToHMS(ms) {
  let totalSeconds = Math.floor(ms / 1000);
  let h = Math.floor(totalSeconds / 3600);
  let m = Math.floor((totalSeconds % 3600) / 60);
  let s = totalSeconds % 60;
  return (
    (h < 10 ? "0" : "") + h + ":" +
    (m < 10 ? "0" : "") + m + ":" +
    (s < 10 ? "0" : "") + s
  );
}
function showCooldownOverlay(remainingMs) {
  let overlay = document.getElementById("cooldown-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "cooldown-overlay";
    overlay.innerHTML = `
      <div class="cooldown-box" style="
        background:rgba(18,14,32,0.98);padding:38px 32px 32px 32px;
        border-radius: 24px; box-shadow: 0 8px 48px #000a; max-width: 350px; min-width: 260px; position:relative;">
        <span id="cooldown-close" style="
          position:absolute;right:18px;top:14px;
          color:#fff;font-size:2.1rem;
          cursor:pointer;font-weight:bold;
          z-index:1001;
          user-select:none;
        " title="Close">&times;</span>
        <img src="assets/player1.png" alt="player" style="width:72px;height:72px;display:block;margin:0 auto 20px;">
        <h2 style="text-align:center;color:#e14b4b;margin:0 0 10px 0;font-family:Pixel,Arial">⏳ Please Wait</h2>
        <div style="text-align:center;font-size:28px;font-family:monospace;color:#fff;margin-bottom:10px;">
          <span id="cooldown-timer">00:00:00</span>
        </div>
        <div style="text-align:center;color:#d5d5d5;font-size:17px;">You can play again after the countdown ends!</div>
      </div>
    `;
    Object.assign(overlay.style, {
      position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10000, background: "rgba(20,20,30,0.90)", backdropFilter: "blur(2px)",
    });
    document.body.appendChild(overlay);
  }
  overlay.style.display = "flex";
  let closeBtn = overlay.querySelector('#cooldown-close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      overlay.style.display = 'none';
    };
  }
  function updateTimer() {
    let msLeft = window.nextPlayTime - Date.now();
    if (msLeft <= 0) {
      overlay.style.display = "none";
    } else {
      document.getElementById("cooldown-timer").textContent = msToHMS(msLeft);
      setTimeout(updateTimer, 1000);
    }
  }
  updateTimer();
}
document.getElementById("play-btn").onclick = async function(e) {
  e.preventDefault();
  if (!userId) return;
  const userRef = db.ref("users/" + userId + "/nextPlayTime");
  const snap = await userRef.get();
  const nextPlayTime = parseInt(snap.val() || "0");
  window.nextPlayTime = nextPlayTime;
  if (nextPlayTime > Date.now()) {
    showCooldownOverlay(nextPlayTime - Date.now());
    return false;
  }
  window.location.href = "play.html";
};

// ========== SHOP FLOATING ICONS & CHARACTER MAIN LOGIC ==========

// Utility
function formatWLC(val) {
  return parseFloat(val).toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}
function formatTimeLeft(ms) {
  if (ms < 0) ms = 0;
  let s = Math.floor(ms/1000) % 60;
  let m = Math.floor(ms/60000) % 60;
  let h = Math.floor(ms/3600000);
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}
const MINING_DURATION = 24 * 60 * 60 * 1000; // 24h in ms

function getMiningStatus(product, data) {
  if (!data?.bought) return { timeLeft: 0, mined: 0 };
  const now = Date.now();
  const start = data.startTime || now;
  let elapsed = Math.min(now - start, MINING_DURATION);
  let mined = product.mining * (elapsed / MINING_DURATION);
  if (data.claimed) mined = 0;
  let timeLeft = Math.max(0, (start + MINING_DURATION) - now);
  return { timeLeft, mined };
}
function isClaimable(data) {
  if (!data?.bought) return false;
  const now = Date.now();
  return !data.claimed && (now - data.startTime >= MINING_DURATION);
}

// Main logic
function setupShopLogic() {
  // Listen to all shopItems
  db.ref("users/" + userId + "/shopItems").on("value", snap => {
    const shopData = snap.val() || {};
    renderFloatingIcons(shopData);
    updateCharacterImage(shopData);
  });
}

function renderFloatingIcons(shopData) {
  const area = document.getElementById("floating-icons-area");
  if (!area) return;
  area.innerHTML = "";
  FLOATING_PRODUCTS.forEach(prod => {
    const data = shopData[prod.id];
    if (data && data.bought) {
      // Timer and mining calculation
      const { timeLeft, mined } = getMiningStatus(prod, data);
      const claimable = isClaimable(data);
      const iconId = `floating-claim-${prod.id}`;
      area.innerHTML += `
        <div class="floating-icon-outer" id="floating-${prod.id}" title="${prod.displayName}">
          <img class="floating-icon-img" src="${prod.img}" alt="${prod.displayName}" />
          <div class="floating-icon-timer" id="floating-timer-${prod.id}">${timeLeft > 0 ? formatTimeLeft(timeLeft) : "00:00:00"}</div>
          <button class="floating-claim-btn${claimable ? "" : " disabled"}" id="${iconId}" ${claimable ? "" : "disabled"}>Claim</button>
        </div>
      `;
      setTimeout(() => {
        const claimBtn = document.getElementById(iconId);
        if (claimBtn) {
          claimBtn.onclick = () => floatingClaimHandler(prod, data);
        }
      }, 50);
    }
  });
}

// Update main character image if any special item is bought
function updateCharacterImage(shopData) {
  let updated = false;
  // Traverse in reverse order for priority (last bought has priority)
  for (let i = CHARACTER_PRODUCTS.length - 1; i >= 0; --i) {
    const prod = CHARACTER_PRODUCTS[i];
    if (shopData[prod.id] && shopData[prod.id].bought) {
      tapCharacter.src = prod.img;
      updated = true;
      break;
    }
  }
  if (!updated) tapCharacter.src = "assets/character.png";
}

// Floating claim handler
async function floatingClaimHandler(prod, data) {
  // Re-read data live
  const snap = await db.ref("users/" + userId + "/shopItems/" + prod.id).once("value");
  const current = snap.val();
  const { timeLeft } = getMiningStatus(prod, current);
  if (timeLeft > 0 || current.claimed) {
    // Not claimable, show notification (optional: feel free to add a popup)
    alert(`You can claim after ${formatTimeLeft(timeLeft)}.`);
    return;
  }
  // Do claim
  let userBalance = 0;
  const balSnap = await db.ref("users/" + userId + "/balance").once("value");
  if (typeof balSnap.val() === "number") userBalance = balSnap.val();
  await db.ref().update({
    [`users/${userId}/balance`]: userBalance + prod.mining,
    [`users/${userId}/shopItems/${prod.id}/claimed`]: true
  });
}

// Floating icons live update
setInterval(() => {
  const area = document.getElementById("floating-icons-area");
  if (!area) return;
  FLOATING_PRODUCTS.forEach(prod => {
    const timerEl = document.getElementById(`floating-timer-${prod.id}`);
    const claimBtn = document.getElementById(`floating-claim-${prod.id}`);
    db.ref("users/" + userId + "/shopItems/" + prod.id).once("value").then(snap => {
      const data = snap.val();
      if (data && data.bought) {
        const { timeLeft } = getMiningStatus(prod, data);
        if (timerEl) timerEl.textContent = timeLeft > 0 ? formatTimeLeft(timeLeft) : "00:00:00";
        if (claimBtn) {
          if (isClaimable(data)) {
            claimBtn.disabled = false;
            claimBtn.classList.remove("disabled");
          } else {
            claimBtn.disabled = true;
            claimBtn.classList.add("disabled");
          }
        }
      }
    });
  });
}, 1000);
