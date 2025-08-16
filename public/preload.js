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

const musicPreferred = sessionStorage.getItem('musicPreferred') === '1';
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
    if (musicPreferred) await audioState.play();
  } catch(e) { console.log('Audio setup failed:', e); }
}

// ---------- Event Handlers ----------
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
  "assets/bmwcar.jpg","assets/bodyguards.png","assets/character.png","assets/character1.png",
  "assets/character10.png","assets/character11.png","assets/character12.png","assets/character13.png",
  "assets/character2.png","assets/character3.png","assets/character4.png","assets/character5.png",
  "assets/character6.png","assets/character7.png","assets/character8.png","assets/character9.png",
  "assets/clock.png","assets/dragon-frame.png","assets/gangsterhat.png","assets/helicopter.jpg",
  "assets/house.png","assets/iphone15.png","assets/palace.png","assets/pitbull.png","assets/player1.png",
  "assets/preload.jpg","assets/preload.mp3","assets/ranked-icon.png","assets/royalthrone.png",
  "assets/shop.jpg","assets/suit.png","assets/wellcoin-icon.png","assets/wife.png","assets/yacht.jpg","assets/ak.png"
];

// ---------- Firebase Config ----------
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

// ---------- Main Preload Logic ----------
async function preloadAll() {
  await preloadBackgroundAndMusic();

  try {
    if (FORCE_CLEAR_CACHE) {
      await idbClear(); await idbSet(CACHE_VERSION_KEY, CACHE_VERSION);
    } else {
      const v = await idbGet(CACHE_VERSION_KEY);
      if (v !== CACHE_VERSION) { await idbClear(); await idbSet(CACHE_VERSION_KEY, CACHE_VERSION); }
    }
  } catch(e) {}

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
        fetch(src).then(r=>r.blob()).then(blob=>{ idbSet('asset:'+src, blob); }).catch(()=>{});
      }
    });
  }));

  setProgress(Math.floor(doneSteps*100/totalSteps), "Loading player data...");
  if (!userId) { setProgress(100, "Please login via Telegram"); return; }

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

  try {
    const shopSnap = await db.ref("users/" + userId + "/shopItems").get();
    if (shopSnap.exists()) { await idbSet('shopItems', shopSnap.val()); }
  } catch(e) {}
  incProgress();

  setProgress(100, "Ready! Entering the game...");
  setTimeout(()=>{ window.location.replace('index.html'); }, 700);
}
document.addEventListener('DOMContentLoaded', preloadAll);

// ========== FX: واقعية لمس الماء + رذاذ مائل خفيف (PixiJS بدون pixi-filters) ==========
(function initFX() {
  window.addEventListener('load', () => {
    const fxHost = document.getElementById('fxHost');
    if (!fxHost) return;

    const hasPIXI = typeof window.PIXI !== 'undefined' && window.PIXI.Application;
    if (!hasPIXI) {
      console.warn('[preload] FX disabled (PIXI unavailable).');
      return;
    }

    const app = new PIXI.Application({
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
      powerPreference: 'high-performance'
    });
    fxHost.appendChild(app.view);

    // خلفية WebGL (لمطابقة صورة الخلفية)
    const bgTexture = PIXI.Texture.from('assets/preload.jpg');
    const bgSprite = new PIXI.Sprite(bgTexture);
    bgSprite.anchor.set(0.5, 1.0); // center-bottom
    app.stage.addChild(bgSprite);

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
    if (bgTexture.baseTexture.valid) fitBg(); else bgTexture.baseTexture.once('loaded', fitBg);
    window.addEventListener('resize', fitBg);

    // Shader تموّج ماء مخصص (Shockwave-like)
    const frag = `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform vec2 center;
      uniform float time;
      uniform float amplitude;
      uniform float wavelength;
      uniform float radius;

      void main(void){
        vec2 uv = vTextureCoord;
        vec2 dir = uv - center;
        float dist = length(dir);

        if (dist < radius) {
          float falloff = smoothstep(radius, 0.0, dist); // أقوى قرب المركز
          // موجة شعاعية: الوقت يحرك الموجة للخارج، وwavelength يتحكم بالتردد
          float wave = sin((dist * wavelength) - (time * 6.28318)) * amplitude * falloff;
          // إزاحة UV باتجاه شعاعي
          if (dist > 0.0001) {
            uv += (dir / dist) * wave;
          }
        }

        gl_FragColor = texture2D(uSampler, uv);
      }
    `;

    function makeWaveFilter(normX, normY, amp, wl, rad) {
      const filter = new PIXI.Filter(undefined, frag, {
        center: new Float32Array([normX, normY]),
        time: 0.0,
        amplitude: amp,        // ~0.007..0.02
        wavelength: wl,        // ~20..35
        radius: rad            // ~0.35..0.7 (normalized)
      });
      return filter;
    }

    const waves = [];
    function addWave(px, py, strong=false) {
      const w = app.renderer.width;
      const h = app.renderer.height;
      const nx = px / w;
      const ny = py / h;
      const amp = strong ? 0.010 : 0.06;
      const wl  = strong ? 20.0 : 15.0;
      const rad = strong ? 0.20 : 0.15;

      const filter = makeWaveFilter(nx, ny, amp, wl, rad);
      const lifeMs = 1300;
      const created = performance.now();

      waves.push({ filter, lifeMs, created });
      // طبّق الفلاتر كسلسلة (كل موجة فلتر مستقل)
      bgSprite.filters = waves.map(w => w.filter);
      if (waves.length > 14) {
        waves.splice(0, waves.length - 14);
        bgSprite.filters = waves.map(w => w.filter);
      }
    }

    // أحداث اللمس/المؤشر
    let pointerDown = false;
    let lastSpawn = 0;
    let lastX = 0, lastY = 0;

    function onDown(e) {
      pointerDown = true;
      const pt = e.touches ? e.touches[0] : e;
      addWave(pt.clientX, pt.clientY, true);
      lastSpawn = performance.now();
      lastX = pt.clientX; lastY = pt.clientY;
    }
    function onMove(e) {
      if (!pointerDown) return;
      const pt = e.touches ? e.touches[0] : e;
      const now = performance.now();
      const dx = pt.clientX - lastX, dy = pt.clientY - lastY;
      const dist = Math.hypot(dx, dy);
      if (dist > 14 || now - lastSpawn > 80) {
        addWave(pt.clientX, pt.clientY, false);
        lastSpawn = now; lastX = pt.clientX; lastY = pt.clientY;
      }
    }
    function onUp() { pointerDown = false; }

    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onUp, { passive: true });
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onUp, { passive: true });

    // رذاذ مطر مائل (جسيمات خفيفة)
    const rainContainer = new PIXI.ParticleContainer(800, { position: true, rotation: true, alpha: true, scale: true });
    app.stage.addChild(rainContainer);

    // نرسم خط رفيع كملمس المطر
    const g = new PIXI.Graphics();
    g.lineStyle(1.0, 0xFFFFFF, 0.8);
    g.moveTo(0, 0);
    g.lineTo(0, 14);
    g.rotation = -0.52; // ميلان
    const streakTex = app.renderer.generateTexture(g, { resolution: 2, scaleMode: PIXI.SCALE_MODES.LINEAR });

    const SPRAY_COUNT = 130;
    const W = () => app.renderer.width;
    const H = () => app.renderer.height;

    const drops = [];
    function spawnDrop(i) {
      const s = new PIXI.Sprite(streakTex);
      s.anchor.set(0.5, 0.1);
      s.alpha = 0.05 + Math.random() * 0.07;
      s.scale.set(0.65 + Math.random() * 0.7);
      s.rotation = -0.58 + (Math.random() * 0.16 - 0.08);
      s.x = Math.random() * (W() + 80) - 40;
      s.y = Math.random() * (H() + 120) - 120;
      const wind = 70 + Math.random() * 100;
      const fall = 160 + Math.random() * 160;
      drops[i] = { s, vx: wind, vy: fall };
      rainContainer.addChild(s);
    }
    for (let i = 0; i < SPRAY_COUNT; i++) spawnDrop(i);

    // تفعيل الأنيميشن
    app.ticker.add((delta) => {
      const t = performance.now();

      // تحديث الموجات (نزيد time بشكل خطي)
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        const age = t - w.created;
        const u = Math.min(1, age / w.lifeMs);
        w.filter.uniforms.time = u; // 0..1
        if (age >= w.lifeMs) {
          waves.splice(i, 1);
          bgSprite.filters = waves.map(x => x.filter);
        }
      }

      // تحريك الرذاذ
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

    // بعد تفعيل WebGL، نخفي خلفية DOM حتى لا تتضاعف
    try { bgEl.style.visibility = 'hidden'; } catch(_) {}
  });
})();
