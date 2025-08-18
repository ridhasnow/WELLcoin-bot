// --- منع الزوم والسكرول ---
document.addEventListener('touchmove', function(event) {
  if (event.scale !== 1) { event.preventDefault(); }
}, { passive: false });
document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });
window.addEventListener('keydown', function(e) {
  if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) { e.preventDefault(); }
}, { passive: false });
window.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
window.addEventListener('scroll', function() { window.scrollTo(0, 0); });
document.body.style.overflow = "hidden";
document.documentElement.style.overflow = "hidden";

// --- حقن ستايل لإزالة الوميض الأزرق والتركيز على الأزرار/الروابط ---
(function injectNoTapFlashCSS(){
  if (document.getElementById('no-tap-flash')) return;
  const style = document.createElement('style');
  style.id = 'no-tap-flash';
  style.textContent = `
    * { -webkit-tap-highlight-color: rgba(0,0,0,0); }
    a, button, [role="button"], .floating-claim-btn, #play-btn, .popup-action-btn, .popup-okey-btn, .popup-close, #cooldown-close {
      -webkit-tap-highlight-color: transparent !important;
      outline: none !important;
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none;
    }
    a:focus, button:focus, [role="button"]:focus, .floating-claim-btn:focus, #play-btn:focus,
    .popup-action-btn:focus, .popup-okey-btn:focus, .popup-close:focus, #cooldown-close:focus {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
})();

// =========== IndexedDB Helper ===========
const IDB_NAME = 'wellcoin_game_cache';
const IDB_STORE = 'cache';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = function() {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbSet(key, val) {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  }));
}
function idbGet(key) {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// ========== تحميل الصور والايقونات من الكاش بسرعة (بدون وميض) ==========
const assetBlobUrlCache = new Map(); // assetPath -> objectURL واحد يعاد استعماله
function setImgAttrsFast(imgEl) {
  try {
    imgEl.loading = 'eager';
    imgEl.decoding = 'async';
    imgEl.referrerPolicy = 'no-referrer';
  } catch {}
}
async function setImgFromCache(imgEl, assetPath) {
  if (!imgEl || !assetPath) return;

  // لو نفس الأصل مضبوط مسبقًا، لا تعمل شيء
  if (imgEl.getAttribute('data-asset') === assetPath) return;

  setImgAttrsFast(imgEl);

  // 1) ذاكرة: لو لدينا URL جاهز لهذا الأصل، اعرضه فورًا
  const memUrl = assetBlobUrlCache.get(assetPath);
  if (memUrl) {
    imgEl.src = memUrl;
    imgEl.setAttribute('data-asset', assetPath);
    imgEl.setAttribute('data-cached', '1');
    return;
  }

  // 2) IndexedDB: حمّل الـ Blob مرة واحدة وأنشئ URL ذاكرته
  try {
    const blob = await idbGet('asset:' + assetPath);
    if (blob instanceof Blob) {
      const url = URL.createObjectURL(blob);
      assetBlobUrlCache.set(assetPath, url);
      imgEl.src = url;
      imgEl.setAttribute('data-asset', assetPath);
      imgEl.setAttribute('data-cached', '1');
      return;
    }
  } catch {}

  // 3) شبكة كملاذ أخير
  imgEl.src = assetPath;
  imgEl.setAttribute('data-asset', assetPath);
  imgEl.removeAttribute('data-cached');
}

// تنظيف روابط الـ Blob عند الخروج
window.addEventListener('beforeunload', () => {
  for (const url of assetBlobUrlCache.values()) {
    try { URL.revokeObjectURL(url); } catch {}
  }
  assetBlobUrlCache.clear();
});

// =========== الموسيقى: استمرار من preload ===========
(function setupMusic() {
  let preloadAudio = document.getElementById('preloadAudio');
  if (!preloadAudio) {
    preloadAudio = document.createElement('audio');
    preloadAudio.id = 'preloadAudio';
    preloadAudio.src = 'assets/preload.mp3';
    preloadAudio.loop = true;
    preloadAudio.preload = 'auto';
    preloadAudio.style.display = 'none';
    document.body.appendChild(preloadAudio);
  }
  function ensureAudioLoop() {
    if (!preloadAudio) return;
    preloadAudio.volume = 0.76;
    preloadAudio.loop = true;
    preloadAudio.onended = () => {
      preloadAudio.currentTime = 0;
      preloadAudio.play().catch(()=>{});
    };
    if (preloadAudio.paused) {
      preloadAudio.play().catch(()=>{});
    }
  }
  document.addEventListener('DOMContentLoaded', ensureAudioLoop);
  window.addEventListener('focus', ensureAudioLoop);
})();

// -------------- Firebase & Telegram --------------
const firebaseConfig = {
  apiKey: "AIzaSyB9uNwUURvf5RsD7CnsG2LtE6fz5yboBkw",
  authDomain: "wellcoinbotgame.firebaseapp.com",
  databaseURL: "https://wellcoinbotgame-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wellcoinbotgame",
  storageBucket: "wellcoinbotgame.appspot.com",
  messagingSenderId: "108640533638",
  appId: "1:108640533638:web:ed07516d96ac38f47f6507"
};
const app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(firebaseConfig);
const db = firebase.database(app);
const tg = window.Telegram.WebApp;
tg.ready();
const userId = tg.initDataUnsafe?.user?.id;
if (!userId) {
  window.location.href = "welcome.html";
}

// عناصر واجهة
const usernameBox = document.getElementById("username-inside");
const balanceDisplay = document.getElementById("balance-amount");
const energyBarContainer = document.getElementById("energy-bar-container");
const energyBarInner = document.getElementById("energy-bar-inner");
const energyBarLabel = document.getElementById("energy-bar-label");
const tapCharacter = document.getElementById("tap-character");

// ========== كاش محلي سريع (معتمد على IndexedDB) ==========
function cacheGet(key, fallback = null) {
  return idbGet(key).then(v => (v === undefined ? fallback : v)).catch(() => fallback);
}
function cacheSet(key, val) {
  return idbSet(key, val);
}
const CACHE_KEYS = {
  username: `wlc:${userId}:username`,
  balance:  `wlc:${userId}:balance`,
  shop:     `wlc:${userId}:shopItems`,
  activeCharacterSrc: `wlc:${userId}:activeCharacterSrc`
};

// ========== تحميل الأصول من الكاش على الواجهة ==========
document.addEventListener('DOMContentLoaded', async () => {
  // صور الهيدر
  setImgFromCache(document.getElementById("ranked"), 'assets/ranked-icon.png');
  setImgFromCache(document.querySelector(".coin-icon"), 'assets/wellcoin-icon.png');
  setImgFromCache(document.querySelector(".dragon-frame-img"), 'assets/dragon-frame.png');
  // صورة الشخصية الأساسية
  let savedChar = await cacheGet(CACHE_KEYS.activeCharacterSrc, null);
  if (!savedChar) savedChar = "assets/character.png";
  setImgFromCache(tapCharacter, savedChar);

  // بيانات الواجهة
  const cachedUsername = await cacheGet(CACHE_KEYS.username, null);
  if (usernameBox && cachedUsername) usernameBox.textContent = cachedUsername;

  const cachedBalance = await cacheGet(CACHE_KEYS.balance, null);
  if (balanceDisplay != null && typeof cachedBalance === 'number') {
    balanceDisplay.textContent = formatWLC(cachedBalance);
    balance = cachedBalance;
  }
});

// ====== SHOP ICONS & CHARACTER IMAGE LOGIC ======
const FLOATING_PRODUCTS = [
  { id: "shop",       img: "assets/shop.jpg",       mining: 0.000007, displayName: "Business Property" },
  { id: "bmwcar",     img: "assets/bmwcar.jpg",     mining: 0.000009, displayName: "BMW Car" },
  { id: "yacht",      img: "assets/yacht.jpg",      mining: 0.000060, displayName: "Yacht" },
  { id: "helicopter", img: "assets/helicopter.jpg", mining: 0.000073, displayName: "Helicopter" },
];
const CHARACTER_PRODUCTS = [
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

// ========== ENERGY/BALANCE STATE ==========
let balance = 0;
let energyTaps = 300;
let maxTaps = 300;
let tapValue = 100.0000000000; // يمكنك تعديلها إلى 100 كما رغبت
let replenishInterval = null;
let tapReplenishTime = 20000;
let tapCooldown = 6000;
let lastSentBalance = balance;
let tapTimeoutId = null;
let lastEnergyTapsDB = 0;
let lastEnergySaveTime = 0;

// تجميع تحديث الرصيد لتقليل الكتابات
let pendingDelta = 0;
let flushTimer = null;
const balanceRef = db.ref("users/" + userId + "/balance");
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    const delta = pendingDelta;
    pendingDelta = 0;
    flushTimer = null;
    if (delta === 0) return;
    try {
      await balanceRef.transaction(cur => {
        if (typeof cur !== "number") cur = 0;
        return cur + delta;
      });
    } catch (e) {
      console.error("Balance flush failed", e);
    }
  }, 400);
}

// ========== ENERGY/BALANCE FUNCTIONS ==========
function saveEnergyToDB() {
  db.ref("users/" + userId).update({ energyTaps: energyTaps, lastEnergySaveTime: Date.now() });
  lastEnergyTapsDB = energyTaps;
  lastEnergySaveTime = Date.now();
}
function sendBalanceToDB() {
  if (balance !== lastSentBalance) {
    db.ref("users/" + userId).update({ balance: balance });
    lastSentBalance = balance;
  }
}

// تحميل بيانات المستخدم من السيرفر مع تهيئة فورية
window.addEventListener("load", async () => {
  const userRef = db.ref("users/" + userId);
  userRef.once("value").then(async (snapshot) => {
    if (!snapshot.exists()) {
      window.location.href = "welcome.html";
      return;
    }
    const userData = snapshot.val();

    // اسم المستخدم + كاش
    const uname = userData.username || "Unknown Player";
    if (usernameBox) usernameBox.textContent = uname;
    cacheSet(CACHE_KEYS.username, uname);

    // رصيد من السيرفر + كاش + مزامنة حية
    balance = parseFloat(userData.balance || 0);
    lastSentBalance = balance;
    updateBalanceDisplay();
    cacheSet(CACHE_KEYS.balance, balance);
    balanceRef.on("value", s => {
      const val = typeof s.val() === "number" ? s.val() : 0;
      balance = val;
      updateBalanceDisplay();
      cacheSet(CACHE_KEYS.balance, val);
    });

    // طاقة النقر
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
    updateEnergyBar();
    startEnergyReplenish();

    // متجر: هيدرِيت من الكاش ثم اسمع للحيّ
    const cachedShop = await cacheGet(CACHE_KEYS.shop, null);
    if (cachedShop) {
      shopDataCache = cachedShop;
      renderFloatingIcons(shopDataCache);
      updateCharacterImage(shopDataCache);
    }
    setupShopLogic(); // يبدأ الاستماع لبيانات المتجر الحية
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
  if (balanceDisplay) balanceDisplay.textContent = formatWLC(balance);
}

// اهتزاز خفيف
function vibrate(ms = 10) {
  if (window.navigator?.vibrate) window.navigator.vibrate(ms);
}

// دخان واقعي و+1
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

  // تحديث فوري في الواجهة + كاش
  updateBalanceDisplay();
  updateEnergyBar();
  cacheSet(CACHE_KEYS.balance, balance);

  // حفظ طاقة النقر
  saveEnergyToDB();

  // جدولة كتابة الرصيد مجمّعة
  pendingDelta += tapValue;
  scheduleFlush();
});

// حفظ الرصيد والطاقة عند الخروج
window.addEventListener("beforeunload", function() {
  if (pendingDelta !== 0) {
    clearTimeout(flushTimer);
    flushTimer = null;
    const delta = pendingDelta;
    pendingDelta = 0;
    try {
      balanceRef.transaction(cur => {
        if (typeof cur !== "number") cur = 0;
        return cur + delta;
      });
    } catch {}
  }
  saveEnergyToDB();
  // ملاحظة: روابط الـ Blob تُنظَّف في مستمع beforeunload الأعلى
});

// زر اللعب ونافذة الكول داون
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
          position:absolute;right:18px;top:14px;color:#fff;font-size:2.1rem;cursor:pointer;font-weight:bold;z-index:1001;user-select:none;">&times;</span>
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
    closeBtn.onclick = function() { overlay.style.display = 'none'; };
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

// ========== POPUP for INDEX (same style as shop) ==========
function ensurePopupStyles() {
  if (document.getElementById("popup-styles-injected")) return;
  const style = document.createElement("style");
  style.id = "popup-styles-injected";
  style.textContent = `
    .popup-modal{position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(20,20,30,0.82);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(2px);animation:fadeIn .2s}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .popup-box{background:#181818;color:#fff;border-radius:18px;min-width:300px;max-width:94vw;box-shadow:0 8px 44px #000b,0 0 0 1.5px #ffd70099;padding:22px 26px 18px 26px;position:relative;text-align:center;animation:popupAppear .14s}
    @keyframes popupAppear{from{transform:scale(.91);opacity:0}to{transform:scale(1);opacity:1}}
    .popup-close{position:absolute;right:13px;top:13px;font-size:1.9rem;color:#ffd700;cursor:pointer;font-weight:bold;z-index:5;user-select:none;transition:color .2s}
    .popup-close:hover{color:#fff}
    .popup-title{font-size:1.4rem;font-weight:bold;color:#ffd700;margin-bottom:10px}
    .popup-desc{color:#fff7cc;font-size:1.08rem;margin-bottom:20px;margin-top:6px}
    .popup-action-btn{background:linear-gradient(90deg,#ffd700 60%,#fffbe1 100%);color:#333;border:none;padding:7px 25px;border-radius:9px;font-size:15px;font-weight:bold;cursor:pointer;box-shadow:0 0 12px #ffd70077;transition:.16s}
    .popup-action-btn:disabled{background:#444;color:#aaa;cursor:not-allowed;box-shadow:none}
    .popup-okey-btn{background:#222;color:#ffd700;border:none;border-radius:9px;font-size:15px;padding:7px 22px;cursor:pointer;margin-top:14px;font-weight:bold;box-shadow:0 0 8px #ffd70033;transition:background .16s}
    .popup-okey-btn:active{background:#333}
  `;
  document.head.appendChild(style);
}
function ensurePopupRoot() {
  let root = document.getElementById("popup-modal-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "popup-modal-root";
    document.body.appendChild(root);
  }
  return root;
}
function closePopup() {
  const root = ensurePopupRoot();
  root.innerHTML = "";
}
function showPopup({title, desc, actions}) {
  ensurePopupStyles();
  const root = ensurePopupRoot();
  root.innerHTML = `
    <div class="popup-modal">
      <div class="popup-box">
        <span class="popup-close" id="popup-close">&times;</span>
        <div class="popup-title">${title || ""}</div>
        <div class="popup-desc">${desc || ""}</div>
        ${actions || ""}
      </div>
    </div>
  `;
  document.getElementById("popup-close").onclick = closePopup;
}
function showOkeyPopup({title, desc}) {
  showPopup({
    title, desc,
    actions: `<button class="popup-okey-btn" id="popup-okey-btn">Okey</button>`
  });
  document.getElementById("popup-okey-btn").onclick = closePopup;
}

// ========== SHOP FLOATING ICONS & CHARACTER MAIN LOGIC ==========
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
const MINING_DURATION = 24 * 60 * 60 * 1000;

function getMiningStatus(product, data) {
  if (!data?.bought) return { timeLeft: 0, mined: 0 };
  const now = Date.now();
  const start = data.startTime || now;
  let elapsed = Math.min(now - start, MINING_DURATION);
  let mined = product.mining * (elapsed / MINING_DURATION);
  let timeLeft = Math.max(0, (start + MINING_DURATION) - now);
  return { timeLeft, mined };
}
function isClaimable(data) {
  if (!data?.bought) return false;
  const now = Date.now();
  return now - (data.startTime || 0) >= MINING_DURATION;
}

let shopDataCache = {};

function setupShopLogic() {
  db.ref("users/" + userId + "/shopItems").on("value", snap => {
    const shopData = snap.val() || {};
    cacheSet(CACHE_KEYS.shop, shopData);
    shopDataCache = shopData;
    renderFloatingIcons(shopDataCache);
    updateCharacterImage(shopDataCache);
  });
}

function renderFloatingIcons(shopData) {
  const area = document.getElementById("floating-icons-area");
  if (!area) return;
  const frag = document.createDocumentFragment();
  FLOATING_PRODUCTS.forEach(prod => {
    const data = shopData[prod.id];
    if (!data || !data.bought) return;

    const { timeLeft } = getMiningStatus(prod, data);
    const claimable = isClaimable(data);

    const outer = document.createElement('div');
    outer.className = 'floating-icon-outer';
    outer.id = `floating-${prod.id}`;
    outer.title = prod.displayName;

    const img = document.createElement('img');
    img.className = 'floating-icon-img';
    img.alt = prod.displayName;
    setImgFromCache(img, prod.img);

    const timer = document.createElement('div');
    timer.className = 'floating-icon-timer';
    timer.id = `floating-timer-${prod.id}`;
    timer.textContent = timeLeft > 0 ? formatTimeLeft(timeLeft) : "00:00:00";

    const btn = document.createElement('button');
    btn.className = 'floating-claim-btn' + (claimable ? '' : ' disabled');
    btn.id = `floating-claim-${prod.id}`;
    btn.disabled = !claimable;
    btn.textContent = 'Claim';
    btn.addEventListener('click', () => floatingClaimHandler(prod));

    outer.append(img, timer, btn);
    frag.appendChild(outer);
  });
  area.replaceChildren(frag);
}

function updateCharacterImage(shopData) {
  let updated = false;
  for (let i = CHARACTER_PRODUCTS.length - 1; i >= 0; --i) {
    const prod = CHARACTER_PRODUCTS[i];
    if (shopData[prod.id] && shopData[prod.id].bought) {
      setImgFromCache(tapCharacter, prod.img);
      cacheSet(CACHE_KEYS.activeCharacterSrc, prod.img);
      updated = true;
      break;
    }
  }
  if (!updated) {
    setImgFromCache(tapCharacter, "assets/character.png");
    cacheSet(CACHE_KEYS.activeCharacterSrc, "assets/character.png");
  }
}

// Floating claim with popup + restart mining
async function floatingClaimHandler(prod) {
  const snap = await db.ref(`users/${userId}/shopItems/${prod.id}`).once("value");
  const data = snap.val();
  if (!data || !data.bought) return;

  const { timeLeft } = getMiningStatus(prod, data);
  if (timeLeft > 0) {
    showOkeyPopup({
      title: "Cannot Claim Yet",
      desc: `You can claim after <b style="color:#ffd700">${formatTimeLeft(timeLeft)}</b>.`
    });
    return;
  }

  showPopup({
    title: "Claim Mining Reward",
    desc: `You will claim <b style="color:#0cf">+${formatWLC(prod.mining)} WLC</b> into your balance and mining will restart.`,
    actions: `<button class="popup-action-btn" id="popup-claim-confirm">Claim</button>`
  });
  document.getElementById("popup-claim-confirm").onclick = async () => {
    closePopup();
    const balSnap = await db.ref("users/" + userId + "/balance").once("value");
    const currentBal = typeof balSnap.val() === "number" ? balSnap.val() : 0;
    const now = Date.now();
    await db.ref().update({
      [`users/${userId}/balance`]: currentBal + prod.mining,
      [`users/${userId}/shopItems/${prod.id}/startTime`]: now,
      [`users/${userId}/shopItems/${prod.id}/claimed`]: false
    });
    cacheSet(CACHE_KEYS.balance, currentBal + prod.mining);

    showOkeyPopup({
      title: "Claimed!",
      desc: `You received <b style="color:#0cf">+${formatWLC(prod.mining)} WLC</b>.<br>Mining restarted for the next 24 hours.`
    });
  };
}

setInterval(() => {
  const area = document.getElementById("floating-icons-area");
  if (!area) return;
  FLOATING_PRODUCTS.forEach(prod => {
    const data = shopDataCache[prod.id];
    if (!data || !data.bought) return;
    const timerEl = document.getElementById(`floating-timer-${prod.id}`);
    const claimBtn = document.getElementById(`floating-claim-${prod.id}`);
    const { timeLeft } = getMiningStatus(prod, data);
    if (timerEl) timerEl.textContent = timeLeft > 0 ? formatTimeLeft(timeLeft) : "00:00:00";
    if (claimBtn) {
      const can = isClaimable(data);
      claimBtn.disabled = !can;
      claimBtn.classList.toggle("disabled", !can);
    }
  });
}, 1000);
