// ---------- DOM Refs ----------
const bgEl = document.getElementById('bg');
const soundBtn = document.getElementById('soundBtn');
const bar = document.getElementById('barFill');
const barText = document.getElementById('barText');
const barRole = document.getElementById('barRole');

// ---------- IndexedDB Helper ----------
const IDB_NAME = 'wellcoin_game_cache';
const IDB_STORE = 'cache';
const CACHE_VERSION_KEY = 'cache_version';
const CACHE_VERSION = 'v3';
const FORCE_CLEAR_CACHE = false;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = function() {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
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
function idbClear() {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  }));
}

// ---------- Audio System ----------
let audioContext;
let audioBuffer;
let audioSource;
let gainNode;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}
function setSoundUI(isPlaying) {
  if (!soundBtn) return;
  if (isPlaying) {
    soundBtn.classList.remove('muted');
    soundBtn.setAttribute('aria-pressed', 'true');
  } else {
    soundBtn.classList.add('muted');
    soundBtn.setAttribute('aria-pressed', 'false');
  }
}

const audioState = {
  isPlaying: true,
  async play() {
    const ctx = ensureAudioContext();
    try { if (ctx.state === 'suspended') await ctx.resume(); } catch(e) {}
    if (audioBuffer && !audioSource) {
      audioSource = ctx.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.loop = true;
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.76;
      audioSource.connect(gainNode);
      gainNode.connect(ctx.destination);
      try { audioSource.start(0); } catch(e) {}
    }
    this.isPlaying = true;
    if (gainNode) gainNode.gain.value = 0.76;
    setSoundUI(true);
  },
  pause() {
    if (gainNode) gainNode.gain.value = 0;
    this.isPlaying = false;
    setSoundUI(false);
  },
  toggle() { this.isPlaying ? this.pause() : this.play(); }
};

let bgObjectUrl = null;

async function preloadBackgroundAndMusic() {
  try {
    const cachedBg = await idbGet('asset:assets/preload.jpg');
    if (cachedBg instanceof Blob) {
      if (bgObjectUrl) URL.revokeObjectURL(bgObjectUrl);
      bgObjectUrl = URL.createObjectURL(cachedBg);
      bgEl.style.background = `url(${bgObjectUrl}) center bottom / cover no-repeat`;
    }
  } catch(e) {}

  await new Promise(resolve => {
    const bgImage = new Image();
    bgImage.onload = resolve;
    bgImage.onerror = resolve;
    bgImage.src = 'assets/preload.jpg';
  });

  try {
    const cachedAudio = await idbGet('asset:assets/preload.mp3');
    let arrayBuffer;
    if (cachedAudio instanceof Blob) {
      arrayBuffer = await cachedAudio.arrayBuffer();
    } else {
      const response = await fetch('assets/preload.mp3');
      arrayBuffer = await response.arrayBuffer();
    }
    audioBuffer = await ensureAudioContext().decodeAudioData(arrayBuffer);

    // محاولة التشغيل التلقائي دائمًا
    await audioState.play().catch(()=>{});
    setTimeout(() => {
      ensureAudioContext().resume().then(() => audioState.play()).catch(()=>{});
    }, 150);
  } catch(e) {
    console.log('Audio setup failed:', e);
  }
}

// ---------- Touch tap dot (صغيرة وخفيفة) ----------
(function initTouchDot() {
  const addDot = (x, y) => {
    const dot = document.createElement('div');
    dot.className = 'touch-dot';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 1100);
  };
  const handler = e => {
    const pt = e.touches ? e.touches[0] : e;
    addDot(pt.clientX, pt.clientY);
  };
  document.addEventListener('pointerdown', handler, { passive: true });
  document.addEventListener('touchstart', handler, { passive: true });
})();

// ---------- Progress Bar Logic ----------
let progress = 0;
let totalSteps = 1;
let doneSteps = 0;
function setProgress(pct, msg) {
  progress = Math.max(0, Math.min(100, pct|0));
  bar.style.width = progress + '%';
  if (barRole) barRole.setAttribute('aria-valuenow', String(progress));
  if (msg) barText.textContent = msg;
}
function incProgress() { doneSteps++; setProgress(Math.floor(doneSteps*100/totalSteps), "Preparing game, please wait..."); }

// ---------- Assets ----------
const BASE_ASSETS = [
  "assets/ak.jpg",
  "assets/bmwcar.jpg",
  "assets/bodyguards.jpg",
  "assets/character.png",
  "assets/character1.png",
  "assets/character10.png",
  "assets/character11.png",
  "assets/character12.png",
  "assets/character13.png",
  "assets/character2.png",
  "assets/character3.png",
  "assets/character4.png",
  "assets/character5.png",
  "assets/character6.png",
  "assets/character7.png",
  "assets/character8.png",
  "assets/character9.png",
  "assets/city1.png",
  "assets/clock.jpg",
  "assets/computer.png",
  "assets/daily-icon.png",
  "assets/dragon-frame.png",
  "assets/enemy1-attack1.png",
  "assets/enemy1-attack2.png",
  "assets/enemy1.png",
  "assets/enemy2.png",
  "assets/facebook-icon.png",
  "assets/fitness.jpg",
  "assets/gangsterhat.jpg",
  "assets/gun_fire_pixel.gif",
  "assets/heart_pixel_grey.png",
  "assets/heart_pixel_red.png",
  "assets/helicopter.jpg",
  "assets/house.png",
  "assets/instagram-icon.png",
  "assets/invit1.png",
  "assets/invit2.png",
  "assets/invit3.png",
  "assets/iphone15.jpg",
  "assets/kartoucha.png",
  "assets/palace.png",
  "assets/pitbull.jpg",
  "assets/player1.png",
  "assets/preload.jpg",
  "assets/preload.mp3",
  "assets/ranked-icon.png",
  "assets/royalthrone.jpg",
  "assets/shop.jpg",
  "assets/suit.png",
  "assets/telegram-icon.png",
  "assets/tiktok-icon.png",
  "assets/twitter-icon.png",
  "assets/wellcoin-icon.png",
  "assets/wife.jpg",
  "assets/wlc.png",
  "assets/yacht.jpg",
  "assets/youtube-icon.png"
];

// ---------- Firebase Config ----------
const firebaseConfig = {
  apiKey: "AIzaSyB9uNwUURvf5RsD7CnsG2LtE6fz5يboBkw",
  authDomain: "wellcoinbotgame.firebaseapp.com",
  databaseURL: "https://wellcoinbotgame-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wellcoinbotgame",
  storageBucket: "wellcoinbotgame.appspot.com",
  messagingSenderId: "108640533638",
  appId: "1:108640533638:web:ed07516d96ac38f47f6507"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tg = window.Telegram.WebApp;
tg.ready();
const tgUser = tg.initDataUnsafe?.user;
const userId = tgUser?.id ? tgUser.id.toString() : null;

// ---------- تسريع التحميل مع توازي + fallback ----------
const CONCURRENCY = 6;
const MAX_RETRIES = 2;

async function fetchBlob(url, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.blob();
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 150 * (attempt + 1)));
    }
  }
}

async function preloadImageOnce(src) {
  try {
    const cached = await idbGet('asset:'+src);
    if (cached instanceof Blob) {
      if ('createImageBitmap' in window) {
        await createImageBitmap(cached).catch(()=>{});
      } else {
        await new Promise(res => {
          const url = URL.createObjectURL(cached);
          const img = new Image();
          img.onload = () => { URL.revokeObjectURL(url); res(); };
          img.onerror = () => { URL.revokeObjectURL(url); res(); };
          img.src = url;
        });
      }
      return true;
    }
  } catch(e) {}

  try {
    const blob = await fetchBlob(src);
    idbSet('asset:'+src, blob).catch(()=>{});
    if ('createImageBitmap' in window) {
      await createImageBitmap(blob).catch(()=>{});
    } else {
      await new Promise(res => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); res(); };
        img.onerror = () => { URL.revokeObjectURL(url); res(); };
        img.src = url;
      });
    }
    return true;
  } catch(e) {
    // Fallback مباشر
    const ok = await new Promise(res => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
    });
    return ok;
  }
}

async function preloadAudioOnce(src) {
  try {
    const cached = await idbGet('asset:'+src);
    if (cached instanceof Blob) return true;
  } catch(e) {}
  try {
    const blob = await fetchBlob(src);
    idbSet('asset:'+src, blob).catch(()=>{});
    return true;
  } catch(e) {
    return false; // لا يوقف الدخول
  }
}

async function loadAsset(src) {
  let ok = false;
  if (src.endsWith('.mp3')) ok = await preloadAudioOnce(src);
  else ok = await preloadImageOnce(src);
  incProgress();
  return { src, ok };
}

async function preloadAssetsWithConcurrency(assets) {
  totalSteps = 2 + assets.length; // + user + shop
  setProgress(0, "Preparing game, please wait...");

  const results = new Array(assets.length);
  let i = 0;
  async function worker() {
    while (i < assets.length) {
      const idx = i++;
      results[idx] = await loadAsset(assets[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, assets.length) }, worker);
  await Promise.all(workers);

  // إعادة محاولة للأصول الفاشلة (مرّة واحدة)
  const failed = results.filter(r => !r.ok).map(r => r.src);
  if (failed.length) {
    const retry = await Promise.all(failed.map(loadAsset));
    for (const r of retry) {
      const idx = assets.indexOf(r.src);
      if (idx >= 0) results[idx] = r;
    }
  }
  return results;
}

// ---------- Main Preload Logic ----------
async function preloadAll() {
  // 1) الخلفية + الموسيقى
  await preloadBackgroundAndMusic();

  // 2) إدارة نسخة الكاش
  try {
    const v = await idbGet(CACHE_VERSION_KEY);
    if (FORCE_CLEAR_CACHE || v !== CACHE_VERSION) {
      await idbClear();
      await idbSet(CACHE_VERSION_KEY, CACHE_VERSION);
    }
  } catch(e) {}

  // 3) تحميل الأصول سريعًا
  const results = await preloadAssetsWithConcurrency(BASE_ASSETS);

  // 4) بيانات المستخدم (شرط أساسي)
  setProgress(Math.floor(doneSteps*100/totalSteps), "Loading player data...");
  if (!userId) {
    setProgress(100, "Please login via Telegram");
    return;
  }
  try {
    const userRef = db.ref("users/" + userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists()) {
      setProgress(100, "Account not found. Please register.");
      setTimeout(()=>window.location.href="welcome.html", 1600);
      return;
    }
    incProgress();
    await idbSet('userData', userSnap.val());
  } catch(e) {
    console.error('Failed to load user:', e);
    setProgress(100, "Network error. Retrying may help.");
  }

  // 5) متجر (غير قاتل)
  try {
    const shopSnap = await db.ref("users/" + userId + "/shopItems").get();
    if (shopSnap.exists()) await idbSet('shopItems', shopSnap.val());
  } catch(e) {}
  incProgress();

  // 6) لا نظهر أي رسالة “assets failed” — نمضي ونترك المفقود يتحمل لاحقًا
  const stillFailed = results.filter(r => !r.ok);
  if (stillFailed.length) {
    console.warn('[preload] Non-blocking assets failed:', stillFailed.map(r=>r.src));
  }

  setProgress(100, "Ready! Entering the game...");
  setTimeout(()=>{ window.location.replace('index.html'); }, 400);
}
document.addEventListener('DOMContentLoaded', preloadAll);

// ---------- Rain-only FX (بدون أي طبقة فوق الصورة) ----------
(function initRain() {
  window.addEventListener('load', () => {
    const host = document.getElementById('rainHost');
    if (!host) return;
    const hasPIXI = typeof window.PIXI !== 'undefined' && window.PIXI.Application;
    if (!hasPIXI) return;

    const app = new PIXI.Application({
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
      powerPreference: 'high-performance'
    });
    host.appendChild(app.view);

    const rain = new PIXI.ParticleContainer(800, { position: true, rotation: true, alpha: true, scale: true });
    app.stage.addChild(rain);

    const g = new PIXI.Graphics();
    g.lineStyle(1.0, 0xFFFFFF, 0.85);
    g.moveTo(0, 0);
    g.lineTo(0, 14);
    g.rotation = -0.52;
    const streakTex = app.renderer.generateTexture(g, { resolution: 2, scaleMode: PIXI.SCALE_MODES.LINEAR });

    const COUNT = 130;
    const W = () => app.renderer.width;
    const H = () => app.renderer.height;

    const drops = [];
    function spawn(i) {
      const s = new PIXI.Sprite(streakTex);
      s.anchor.set(0.5, 0.1);
      s.alpha = 0.05 + Math.random() * 0.07;
      s.scale.set(0.65 + Math.random() * 0.7);
      s.rotation = -0.58 + (Math.random() * 0.16 - 0.08);
      s.x = Math.random() * (W() + 80) - 60;
      s.y = Math.random() * (H() + 120) - 120;
      const wind = 70 + Math.random() * 100;
      const fall = 160 + Math.random() * 160;
      drops[i] = { s, vx: wind, vy: fall };
      rain.addChild(s);
    }
    for (let i = 0; i < COUNT; i++) spawn(i);

    app.ticker.add((delta) => {
      const dt = delta / 60;
      const width = W(), height = H();
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]; const s = d.s;
        s.x += d.vx * dt;
        s.y += d.vy * dt;
        if (s.x > width + 60 || s.y > height + 80) {
          s.x = Math.random() * (width + 80) - 60;
          s.y = -40 - Math.random() * 120;
          s.alpha = 0.05 + Math.random() * 0.07;
          d.vx = 70 + Math.random() * 100;
          d.vy = 160 + Math.random() * 160;
        }
      }
    });
  });
})();

// ---------- Touch dot (listener) ----------
(function initTouchDotListener() {
  // موجودة فوق في CSS والإنشاء في initTouchDot
})();
