// تأكيد تحميل الملف
console.log('[preload] script loaded');

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
const CACHE_VERSION = 'v1';
const FORCE_CLEAR_CACHE = true;

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
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch(e) {}
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
  toggle() {
    if (this.isPlaying) this.pause(); else this.play();
  }
};

// Try preference (if any)
const musicPreferred = sessionStorage.getItem('musicPreferred') === '1';

let bgObjectUrl = null;

async function preloadBackgroundAndMusic() {
  // Background from cache if available
  try {
    const cachedBg = await idbGet('asset:assets/preload.jpg');
    if (cachedBg instanceof Blob) {
      if (bgObjectUrl) URL.revokeObjectURL(bgObjectUrl);
      bgObjectUrl = URL.createObjectURL(cachedBg);
      bgEl.style.background = `url(${bgObjectUrl}) center bottom / cover no-repeat`;
    }
  } catch(e) {}

  // Ensure background image is loaded
  await new Promise(resolve => {
    const bgImage = new Image();
    bgImage.onload = resolve;
    bgImage.onerror = resolve;
    bgImage.src = 'assets/preload.jpg';
  });

  // Music
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
    if (musicPreferred) await audioState.play();
  } catch(e) {
    console.log('Audio setup failed:', e);
  }
}

// Events
if (soundBtn) soundBtn.addEventListener('click', () => audioState.toggle());
document.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') audioState.toggle();
});
document.addEventListener('click', () => {
  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => audioState.play());
  } else if (!audioSource && audioBuffer) {
    audioState.play();
  }
}, { once: true });

window.addEventListener('beforeunload', () => {
  if (bgObjectUrl) { URL.revokeObjectURL(bgObjectUrl); bgObjectUrl = null; }
});

// Progress
let progress = 0;
let totalSteps = 1;
let doneSteps = 0;
function setProgress(pct, msg) {
  progress = Math.max(0, Math.min(100, pct|0));
  bar.style.width = progress + '%';
  if (barRole) barRole.setAttribute('aria-valuenow', String(progress));
  if (msg) barText.textContent = msg;
}
function incProgress() {
  doneSteps++;
  setProgress(Math.floor(doneSteps*100/totalSteps), "Preparing game, please wait...");
}

// Assets
const BASE_ASSETS = [
  "assets/bmwcar.jpg","assets/bodyguards.png","assets/character.png","assets/character1.png",
  "assets/character10.png","assets/character11.png","assets/character12.png","assets/character13.png",
  "assets/character2.png","assets/character3.png","assets/character4.png","assets/character5.png",
  "assets/character6.png","assets/character7.png","assets/character8.png","assets/character9.png",
  "assets/clock.png","assets/dragon-frame.png","assets/gangsterhat.png","assets/helicopter.jpg",
  "assets/house.png","assets/iphone15.png","assets/palace.png","assets/pitbull.png","assets/player1.png",
  "assets/preload.jpg","assets/preload.mp3","assets/ranked-icon.png","assets/royalthrone.png",
  "assets/shop.jpg","assets/suit.png","assets/wellcoin-icon.png","assets/wife.png","assets/yacht.jpg","assets/ak.png"
];

// Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB9uNwUURvf5RsD7CnsG2LtE6fz5yboBkw",
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

// Main preload
async function preloadAll() {
  // 1) BG + Music
  await preloadBackgroundAndMusic();

  // 2) Cache clear / version
  try {
    if (FORCE_CLEAR_CACHE) {
      await idbClear();
      await idbSet(CACHE_VERSION_KEY, CACHE_VERSION);
    } else {
      const v = await idbGet(CACHE_VERSION_KEY);
      if (v !== CACHE_VERSION) {
        await idbClear();
        await idbSet(CACHE_VERSION_KEY, CACHE_VERSION);
      }
    }
  } catch(e) {}

  // 3) Load assets
  totalSteps = 2 + BASE_ASSETS.length;
  setProgress(0, "Preparing game, please wait...");
  await Promise.all(BASE_ASSETS.map(src => {
    return new Promise(res => {
      if (src.endsWith('.mp3')) {
        fetch(src).then(r=>r.blob()).then(blob=>{
          idbSet('asset:'+src, blob).finally(()=>{ incProgress(); res(); });
        }).catch(()=>{ incProgress(); res(); });
      } else {
        const img = new Image();
        img.onload = () => { incProgress(); res(); };
        img.onerror = () => { incProgress(); res(); };
        img.src = src;
        fetch(src).then(r=>r.blob()).then(blob=>{
          idbSet('asset:'+src, blob);
        }).catch(()=>{});
      }
    });
  }));

  // 4) User data
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

  // 5) Shop
  try {
    const shopSnap = await db.ref("users/" + userId + "/shopItems").get();
    if (shopSnap.exists()) {
      await idbSet('shopItems', shopSnap.val());
    }
  } catch(e) {}
  incProgress();

  // 6) Go
  setProgress(100, "Ready! Entering the game...");
  setTimeout(()=>{ window.location.replace('index.html'); }, 700);
}

document.addEventListener('DOMContentLoaded', preloadAll);

// ========== FX: واقعية لمس الماء + رذاذ مائل خفيف (PixiJS) ==========
(function initFX() {
  window.addEventListener('load', () => {
    const fxHost = document.getElementById('fxHost');
    if (!fxHost) return;

    const hasPIXI = typeof window.PIXI !== 'undefined' && window.PIXI.Application;
    const hasShockwave = hasPIXI && window.PIXI.filters && window.PIXI.filters.ShockwaveFilter;
    if (!hasPIXI || !hasShockwave) {
      console.warn('[preload] FX disabled (PIXI or ShockwaveFilter unavailable).');
      return;
    }

    const app = new PIXI.Application({
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
      powerPreference: 'high-performance'
    });
    fxHost.appendChild(app.view);

    const scene = new PIXI.Container();
    app.stage.addChild(scene);

    const bgTexture = PIXI.Texture.from('assets/preload.jpg');
    const bgSprite = new PIXI.Sprite(bgTexture);
    bgSprite.anchor.set(0.5, 1.0);
    scene.addChild(bgSprite);

    function fitBg() {
      const w = app.renderer.width;
      const h = app.renderer.height;
      bgSprite.position.set(w / 2, h);
      if (bgTexture.baseTexture.valid) {
        const scaleX = w / bgTexture.width;
        const scaleY = h / bgTexture.height;
        const scale = Math.max(scaleX, scaleY);
        bgSprite.scale.set(scale);
      }
    }
    if (bgTexture.baseTexture.valid) fitBg();
    else bgTexture.baseTexture.once('loaded', fitBg);
    window.addEventListener('resize', fitBg);

    const colorMatrix = new PIXI.filters.ColorMatrixFilter();
    colorMatrix.brightness(0.53, false);
    colorMatrix.contrast(0.95, true);
    colorMatrix.saturate(1.06, true);

    const waves = [];
    function recomputeFilters() {
      bgSprite.filters = [colorMatrix].concat(waves.map(w => w.filter));
    }

    function stagePos(clientX, clientY) {
      const rect = app.view.getBoundingClientRect();
      const x = (clientX - rect.left) * (app.renderer.width / rect.width);
      const y = (clientY - rect.top) * (app.renderer.height / rect.height);
      return { x, y };
    }

    function spawnWave(clientX, clientY, strong=false) {
      const { x, y } = stagePos(clientX, clientY);
      const Shock = PIXI.filters.ShockwaveFilter;
      const wavelength = strong ? 28 : 22;
      const amplitude = strong ? 65 : 48;

      const filter = new Shock([x, y], { amplitude, wavelength, brightness: 1.0, radius: 0.75 });
      const lifeMs = 1300;
      const created = performance.now();
      const wave = { filter, created, lifeMs };
      waves.push(wave);
      if (waves.length > 12) waves.splice(0, waves.length - 12);
      recomputeFilters();
    }

    let pointerDown = false;
    let lastSpawnT = 0;
    let lastX = 0, lastY = 0;

    function onPointerDown(e) {
      pointerDown = true;
      const pt = e.touches ? e.touches[0] : e;
      spawnWave(pt.clientX, pt.clientY, true);
      lastSpawnT = performance.now();
      lastX = pt.clientX; lastY = pt.clientY;
    }
    function onPointerMove(e) {
      if (!pointerDown) return;
      const pt = e.touches ? e.touches[0] : e;
      const now = performance.now();
      const dx = pt.clientX - lastX, dy = pt.clientY - lastY;
      const dist = Math.hypot(dx, dy);
      if (dist > 16 || now - lastSpawnT > 80) {
        spawnWave(pt.clientX, pt.clientY, false);
        lastSpawnT = now; lastX = pt.clientX; lastY = pt.clientY;
      }
    }
    function onPointerUp() { pointerDown = false; }

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('touchmove', onPointerMove, { passive: true });
    document.addEventListener('touchend', onPointerUp, { passive: true });

    // Rain spray particles
    const rainContainer = new PIXI.ParticleContainer(800, { position: true, rotation: true, alpha: true, scale: true });
    app.stage.addChild(rainContainer);

    const streakGfx = new PIXI.Graphics();
    streakGfx.lineStyle(1.0, 0xFFFFFF, 0.8);
    streakGfx.moveTo(0, 0);
    streakGfx.lineTo(0, 14);
    streakGfx.rotation = -0.45;
    const streakTex = app.renderer.generateTexture(streakGfx, { resolution: 2, scaleMode: PIXI.SCALE_MODES.LINEAR });

    const SPRAY_COUNT = 120;
    const W = () => app.renderer.width;
    const H = () => app.renderer.height;
    const particles = [];
    function spawnParticle(i) {
      const s = new PIXI.Sprite(streakTex);
      s.anchor.set(0.5, 0.1);
      s.alpha = 0.06 + Math.random() * 0.06;
      s.scale.set(0.7 + Math.random() * 0.6);
      s.rotation = -0.6 + (Math.random() * 0.12 - 0.06);
      s.x = Math.random() * (W() + 60) - 30;
      s.y = Math.random() * (H() + 60) - 60;
      const wind = 60 + Math.random() * 80;
      const fall = 140 + Math.random() * 120;
      particles[i] = { s, vx: wind, vy: fall };
      rainContainer.addChild(s);
    }
    for (let i = 0; i < SPRAY_COUNT; i++) spawnParticle(i);

    app.ticker.add((delta) => {
      const t = performance.now();

      // animate waves
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        const age = t - w.created;
        const u = Math.min(1, age / w.lifeMs);
        w.filter.time = u * 1.0;
        if (age >= w.lifeMs) {
          waves.splice(i, 1);
          recomputeFilters();
        }
      }

      // rain
      const dt = delta / 60;
      const width = W(), height = H();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const s = p.s;
        s.x += (p.vx) * dt;
        s.y += (p.vy) * dt;
        if (s.x > width + 40 || s.y > height + 40) {
          s.x = Math.random() * (width + 40) - 60;
          s.y = -20 - Math.random() * 80;
          s.alpha = 0.05 + Math.random() * 0.07;
          p.vx = 60 + Math.random() * 80;
          p.vy = 140 + Math.random() * 120;
        }
      }
    });

    // أخفي خلفية DOM بعد تفعيل WebGL لتجنب الطبقتين
    try { bgEl.style.visibility = 'hidden'; } catch(_) {}
  });
})();
