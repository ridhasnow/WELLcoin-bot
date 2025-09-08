// Keep music alive
(function audioBoot(){
  let a = document.getElementById('preloadAudio');
  if (!a) {
    a = document.createElement('audio');
    a.id = 'preloadAudio';
    a.loop = true; a.preload='auto'; a.style.display='none';
    a.src = 'assets/preload.mp3';
    document.body.appendChild(a);
  }
  function persist(){ try{
    sessionStorage.setItem('wlc_music_ct', String(a.currentTime||0));
    sessionStorage.setItem('wlc_music_track','assets/preload.mp3');
  }catch{}}
  function prime(){ try{ a.muted = true; a.volume=.76; a.play().catch(()=>{});}catch{}}
  function unmute(){ a.muted=false; a.volume=.76; a.play().catch(()=>{}); }
  prime();
  const ensure = ()=>{ unmute(); off(); };
  function off(){ ['pointerdown','touchstart','click','keydown'].forEach(ev=>document.removeEventListener(ev,ensure,{passive:true})); }
  ['pointerdown','touchstart','click','keydown'].forEach(ev=>document.addEventListener(ev,ensure,{passive:true, once:true}));
  window.addEventListener('pagehide', persist); window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', ()=>{ if (document.hidden) persist(); else a.play().catch(()=>{}); });
})();

// Harden
(function harden(){
  try{
    document.addEventListener('contextmenu', e=>e.preventDefault());
    document.addEventListener('dragstart', e=>e.preventDefault(), {passive:false});
    document.addEventListener('keydown', e=>{
      const k = e.key?.toLowerCase();
      if (k==='f12' || (e.ctrlKey&&e.shiftKey&&(k==='i'||k==='j'||k==='c')) || (e.ctrlKey && k==='u')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    ['log','info','debug'].forEach(m=>{ try{ console[m]=()=>{} }catch{} });
  }catch{}
})();

// Telegram
const tg = window.Telegram?.WebApp;
try { tg && tg.ready(); } catch(e){}

let tgUser = tg?.initDataUnsafe?.user || null;
let userId = tgUser?.id || null;

// Gate helpers
let authOK = false;
function showGate(show){
  const g = document.getElementById('gate');
  g.style.display = show ? 'flex' : 'none';
  const app = document.getElementById('app-wrap');
  app.style.filter = show ? 'blur(6px) brightness(.6)' : '';
  app.style.pointerEvents = show ? 'none' : '';
}
setTimeout(()=>{
  if (!authOK && !(tg && tg.initDataUnsafe && tg.initDataUnsafe.user)) showGate(true);
}, 200);

// Stored ID helpers
function storedId(){
  try{
    return sessionStorage.getItem('wlc_user_id') || localStorage.getItem('wlc_user_id') || null;
  }catch{ return null; }
}
function ensureUserId(cb){
  if (!userId) userId = storedId();
  if (userId) { authOK = true; return cb(); }
  setTimeout(()=>{
    tgUser = tg?.initDataUnsafe?.user || tgUser;
    userId = tgUser?.id || storedId();
    if (userId) { authOK = true; cb(); }
    else {
      showGate(true);
      try{ window.location.replace('welcome.html'); }catch{}
    }
  }, 80);
}

// IDB
const IDB_NAME='wellcoin_game_cache', IDB_STORE='cache';
function openIDB(){ return new Promise((res,rej)=>{ const r=indexedDB.open(IDB_NAME,1); r.onupgradeneeded=()=>{const db=r.result; if(!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);}; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);});}
function idbGet(key){ return openIDB().then(db=>new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readonly'); const rq=tx.objectStore(IDB_STORE).get(key); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error);}));}
function idbSet(key,val){ return openIDB().then(db=>new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readwrite'); tx.objectStore(IDB_STORE).put(val,key); tx.oncomplete=res; tx.onerror=()=>rej(tx.error);}));}

// UI refs
const backBtn = document.getElementById('back-btn');
const cfgBtn  = document.getElementById('cfg-btn');

const nameEl = document.getElementById('player-name');
const wlcEl  = document.getElementById('wlc-amount');
const usdtEl = document.getElementById('usdt-amount');
const achGrid= document.getElementById('ach');
const mask   = document.getElementById('mask');
const popOk  = document.getElementById('pop-ok');

// Rank UI refs
const rankNameEl = document.getElementById('rank-name');
const rankBadgeEl= document.getElementById('rank-badge');
const rankFillEl = document.getElementById('rank-progress-fill');
const rankTextEl = document.getElementById('rank-progress-text');
const rankNeedEl = document.getElementById('rank-next-need');

// Tasks modal refs (legacy)
const tasksModal = document.getElementById('tasks-modal');
const tasksFrame = document.getElementById('tasks-frame');
const tasksClose = document.getElementById('tasks-close');

// Invites
const invitesEl = document.getElementById('invites');
const invitesEmptyEl = document.getElementById('invites-empty');

// Navigation
backBtn.addEventListener('click', (e)=>{ e.preventDefault(); go('index.html'); });
cfgBtn.addEventListener('click', (e)=>{ e.preventDefault(); go('config.html'); });
function go(url){
  try{
    const a = document.getElementById('preloadAudio');
    if (a) {
      sessionStorage.setItem('wlc_music_ct', String(a.currentTime||0));
      sessionStorage.setItem('wlc_music_track','assets/preload.mp3');
    }
  }catch{}
  window.location.href = url;
}

// Formatters
const fmtInt = v => Number(v||0).toLocaleString("en-US",{maximumFractionDigits:0});
const fmtWLC = v => Number(v||0).toLocaleString("en-US",{minimumFractionDigits:6, maximumFractionDigits:6});
const fmtUSD = v => Number(v||0).toLocaleString("en-US",{minimumFractionDigits:5, maximumFractionDigits:5});
const msToHMS = (ms)=>{ if(ms<0) ms=0; const s=Math.floor(ms/1000)%60, m=Math.floor(ms/60000)%60, h=Math.floor(ms/3600000); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };

// Grid
const SPECIAL = new Set([7,15,24,30]);
function buildGrid(){
  achGrid.innerHTML = '';
  for(let i=1;i<=30;i++){
    const d = document.createElement('div');
    d.className = 'day' + (SPECIAL.has(i)?' special':'');
    d.dataset.day = i;
    d.innerHTML = `
      <div class="cap">
        <span class="pin l"></span>
        <span class="pin r"></span>
        Day ${i}
      </div>
      <div class="body">
        <img class="gift-img" src="assets/gift.png" alt="gift" draggable="false">
      </div>
      <div class="timer" style="display:none"></div>
      <div class="check">
        <div class="mark">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <radialGradient id="g" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#9cffc8" stop-opacity="1"/>
                <stop offset="70%" stop-color="#45e27f" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="#00c060" stop-opacity="0.0"/>
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="22" fill="url(#g)"></circle>
            <path d="M22 33.5l6 6 14-14" fill="none" stroke="#dfffef" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    `;
    achGrid.appendChild(d);
  }
}
buildGrid();

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
const app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(firebaseConfig);
const db = firebase.database(app);

// Server time
let serverOffset = 0;
db.ref(".info/serverTimeOffset").on("value", s=>{ serverOffset = s.val()||0; });
const now = ()=> Date.now() + serverOffset;

// State and constants
let daily = null, timerId = null;
const DAY_MS = 24*3600*1000;
const CLAIM_WINDOW_MS = 8*3600*1000;

// ENSURE: strict rules requested by user
// - If user misses the 8h window for any day -> reset to Day 1, clear progress.
// - After reset, Day 1 stays available indefinitely until claimed (no expiry).
// - After finishing Day 30, mark completed=true; no more progress/rewards.
function ensureStateInit(u, tNow){
  if (!u) u = {};
  if (!u.meDailyState){
    u.meDailyState = {
      currentDay: 1,
      lastClaimAt: 0,
      nextAvailableAt: tNow,
      expiresAt: tNow + CLAIM_WINDOW_MS,
      stickyStart: false, // becomes true only after a reset due to a miss
      completed: false,
      claimedDays: {},
      version: 3
    };
  } else {
    const st = u.meDailyState;
    // Ensure fields exist
    if (typeof st.currentDay !== 'number') st.currentDay = 1;
    if (typeof st.lastClaimAt !== 'number') st.lastClaimAt = 0;
    if (typeof st.nextAvailableAt !== 'number') st.nextAvailableAt = tNow;
    if (typeof st.expiresAt !== 'number') st.expiresAt = tNow + CLAIM_WINDOW_MS;
    if (typeof st.stickyStart !== 'boolean') st.stickyStart = false;
    if (typeof st.completed !== 'boolean') st.completed = false;
    st.claimedDays = st.claimedDays || {};
    st.version = 3;

    // If already completed, freeze state
    if (!st.completed){
      // If missed window for the current day AND not stickyStart (because stickyStart means no expiry on Day1)
      const missed = (tNow > st.expiresAt) && (tNow >= st.nextAvailableAt) && !(st.stickyStart && st.currentDay===1);
      if (missed){
        // Reset to day 1 and keep it available indefinitely until claim
        st.currentDay = 1;
        st.lastClaimAt = 0;
        st.nextAvailableAt = tNow;
        st.expiresAt = Number.MAX_SAFE_INTEGER; // effectively no expiry for start until claim
        st.stickyStart = true;
        st.claimedDays = {};
      }
    }

    u.meDailyState = st;
  }

  if (typeof u.usdtBalance !== 'number') u.usdtBalance = 0;
  if (typeof u.balance !== 'number') u.balance = 0;
  return u;
}

function rewardFor(day){
  if (day===7)  return { type:'WLC', amount:0.1,  label:'+0.100000 WLC' };
  if (day===15) return { type:'USDT',amount:0.2,  label:'+0.20000 USDT' };
  if (day===24) return { type:'WLC', amount:1.0,  label:'+1.000000 WLC' };
  if (day===30) return { type:'WLC_MEDAL', amount:2.0, label:'+2.000000 WLC + Medal' };
  const pool = [
    {type:'WLC',  amount:0.000005, label:'+0.000005 WLC'},
    {type:'WLC',  amount:0.00004,  label:'+0.000040 WLC'},
    {type:'USDT', amount:0.002,    label:'+0.00200 USDT'},
    {type:'USDT', amount:0.01,     label:'+0.01000 USDT'},
  ];
  return pool[Math.floor(Math.random()*pool.length)];
}

function render(){
  if (!daily) return;

  const t = now(), st = daily;
  const completed = !!st.completed;

  document.querySelectorAll('.day').forEach(tile=>{
    const day = Number(tile.dataset.day);
    tile.classList.remove('locked','claimable','claimed');
    const timerEl = tile.querySelector('.timer');
    timerEl.style.display='none'; timerEl.textContent='';

    if (completed){
      tile.classList.add('claimed');
      return;
    }

    const isCurrent = (day === st.currentDay);
    const isSticky = (st.stickyStart && st.currentDay===1);

    // Already claimed explicitly?
    const claimed = !!(st.claimedDays && st.claimedDays[day]);

    if (claimed){
      tile.classList.add('claimed');
      return;
    }

    if (!isCurrent){
      // Before current day: show as locked (not auto-claimed)
      // After current: locked
      tile.classList.add('locked');
      return;
    }

    // Current day
    if (isSticky){
      // Day 1 after reset: always claimable; no timer
      tile.classList.add('claimable');
      return;
    }

    if (t >= st.nextAvailableAt && t <= st.expiresAt){
      tile.classList.add('claimable');
      // Optional: countdown to expires
      timerEl.style.display='';
      timerEl.textContent = `Ends in ${msToHMS(st.expiresAt - t)}`;
    } else if (t < st.nextAvailableAt){
      tile.classList.add('locked');
      timerEl.style.display='';
      timerEl.textContent = msToHMS(st.nextAvailableAt - t);
    } else {
      tile.classList.add('locked');
    }
  });
}

// Confetti (for win)
function confetti(){
  const c = document.getElementById('confetti'), x = c.getContext('2d');
  let W = c.width = innerWidth, H = c.height = innerHeight;
  const P = Array.from({length: 110}, ()=>({
    x: Math.random()*W, y: -10-Math.random()*H*0.2,
    r: 3+Math.random()*4, c: `hsl(${Math.random()*360}, 90%, 60%)`,
    vx: -1+Math.random()*2, vy: 1+Math.random()*2.5, g:.05+Math.random()*.1, a:1
  }));
  let run = true, t0 = performance.now();
  function frame(t){
    if (!run) return;
    x.clearRect(0,0,W,H);
    for (const p of P){
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.a -= 0.004;
      x.globalAlpha = Math.max(0,p.a); x.fillStyle = p.c; x.fillRect(p.x, p.y, p.r, p.r);
    }
    if (t - t0 < 2600) requestAnimationFrame(frame); else { run=false; x.clearRect(0,0,W,H); }
  }
  requestAnimationFrame(frame);
  addEventListener('resize', ()=>{ W=c.width=innerWidth; H=c.height=innerHeight; }, { once:true });
}

// Popup
function showPop(title, desc, reward){
  document.getElementById('pop-title').textContent = title || 'Congratulations!';
  document.getElementById('pop-desc').innerHTML  = desc || 'You’ve received a reward.';
  const r = document.getElementById('pop-reward');
  if (reward){ r.style.display=''; r.textContent = reward; } else { r.style.display='none'; }
  mask.style.display='flex';
  if (reward) confetti();
}
popOk.addEventListener('click', ()=>{ mask.style.display='none'; });

// Withdraw popup
function showWithdrawInfo(){
  showPop(
    'Withdraw',
    'Withdraw coming soon.<br><span style="color:#cfe6ff">Don’t forget to add your wallet address from <b>Settings</b>.</span>',
    ''
  );
}

// Tile handlers
function attachTileHandlers(userRef){
  achGrid.addEventListener('click', (e)=>{
    const tile = e.target.closest('.day'); if (!tile) return;
    if (!daily || daily.completed) return;

    const day = Number(tile.dataset.day);
    if (day !== daily.currentDay) return;

    const t = now();
    const isSticky = (daily.stickyStart && daily.currentDay===1);

    // Allow claim if sticky-start OR within the window
    const inWindow = (t >= daily.nextAvailableAt && t <= daily.expiresAt);
    if (!(isSticky || inWindow)) return;

    claim(userRef, day);
  });
}

async function sync(userRef){
  const tNow = now();
  await userRef.transaction(u=> ensureStateInit(u, tNow));
  const snap = await userRef.once('value');
  daily = snap.val().meDailyState;
  render();

  if (!timerId){
    timerId = setInterval(()=>{
      const t = now();
      render();
      // If window passed (and not sticky/completed), let server reset to day1 on next sync
      if (!daily.completed && !(daily.stickyStart && daily.currentDay===1) && t > daily.expiresAt) {
        sync(userRef).catch(()=>{});
      }
    }, 1000);
  }
}

async function claim(userRef, day){
  const tNow = now(); let reward = null; let finished = false;
  await userRef.transaction(u=>{
    u = ensureStateInit(u, tNow);
    const st = u.meDailyState;
    if (st.completed) return u;
    if (day !== st.currentDay) return u;

    const isSticky = (st.stickyStart && st.currentDay===1);
    const inWindow = (tNow >= st.nextAvailableAt && tNow <= st.expiresAt);

    if (!(isSticky || inWindow)) return u;

    // Grant reward
    const rw = rewardFor(day);
    if (rw.type.startsWith('WLC')) u.balance = (u.balance||0) + rw.amount;
    if (rw.type==='USDT')         u.usdtBalance = (u.usdtBalance||0) + rw.amount;

    st.claimedDays = st.claimedDays || {};
    st.claimedDays[String(day)] = tNow;
    st.lastClaimAt = tNow;

    // Progress or finish
    if (day >= 30){
      st.completed = true;
      st.currentDay = 30;
      st.nextAvailableAt = Number.MAX_SAFE_INTEGER;
      st.expiresAt = Number.MAX_SAFE_INTEGER;
      st.stickyStart = false;
      finished = true;
    } else {
      st.currentDay = day + 1;
      st.stickyStart = false; // turn off sticky after Day 1 claim
      st.nextAvailableAt = tNow + DAY_MS;
      st.expiresAt = st.nextAvailableAt + CLAIM_WINDOW_MS;
    }

    u.meDailyState = st; reward = rw; return u;
  });

  const s = await userRef.once('value');
  daily = s.val().meDailyState; render();

  if (reward){
    if (reward.type.startsWith('WLC')){
      const newW = s.val().balance || 0;
      wlcEl.textContent = fmtWLC(newW);
      idbSet(`wlc:${userId}:balance`, newW).catch(()=>{});
      updateRankUI(newW);
    } else {
      const newU = s.val().usdtBalance || 0;
      usdtEl.textContent = fmtUSD(newU);
    }
    if (finished){
      showPop('All Daily Achievements Completed!', 'You finished all 30 days. This section is now complete.', reward.label);
    } else {
      showPop('Congratulations!', 'Your daily reward has been added to your balance.', reward.label);
    }
  }
}

// Ranks
const RANKS = [
  { name:'Iron',         key:'iron',        min:     0, img:'iron.png' },
  { name:'Bronze',       key:'bronze',      min:  1500, img:'bronze.png' },
  { name:'Silver',       key:'silver',      min:  3000, img:'silver.png' },
  { name:'Gold',         key:'gold',        min:  5000, img:'gold.png' },
  { name:'Platinum',     key:'plat',        min:  8000, img:'plat.png' },
  { name:'Emerald',      key:'emrald',      min: 10500, img:'emrald.png' },
  { name:'Diamond',      key:'diamon',      min: 15000, img:'diamon.png' },
  { name:'Master',       key:'master',      min: 20000, img:'master.png' },
  { name:'Grand Master', key:'grandmaster', min: 30000, img:'grandmaster (1).png' },
  { name:'Challenger',   key:'challenger',  min: 50000, img:'challenger.png' }
];
function computeRank(balance){
  const b = Math.max(0, Number(balance||0));
  let idx = 0;
  for (let i=0;i<RANKS.length;i++){ if (b >= RANKS[i].min) idx = i; }
  const cur = RANKS[idx];
  const next = RANKS[idx+1] || null;
  const min = cur.min;
  const nextMin = next ? next.min : null;
  let pct = 1;
  if (nextMin !== null){
    pct = Math.max(0, Math.min(1, (b - min) / (nextMin - min)));
  }
  return { b, cur, next, min, nextMin, pct };
}
function updateRankUI(balance){
  const { b, cur, next, min, nextMin, pct } = computeRank(balance);
  rankNameEl.textContent = cur.name;
  const imgPath = `assets/${cur.img}`;
  if (rankBadgeEl.getAttribute('src') !== imgPath){
    rankBadgeEl.setAttribute('src', imgPath);
    rankBadgeEl.setAttribute('alt', `${cur.name} badge`);
  }
  rankFillEl.style.width = `${Math.round(pct*100)}%`;

  if (nextMin === null){
    rankTextEl.textContent = `${fmtInt(b)} / ${fmtInt(cur.min)}+`;
    rankNeedEl.textContent = `Max Rank • ${cur.name}`;
  } else {
    rankTextEl.textContent = `${fmtInt(b)} / ${fmtInt(nextMin)}`;
    const need = Math.max(0, nextMin - b);
    rankNeedEl.textContent = need > 0
      ? `Need ${fmtInt(need)} WLC to reach ${next.name}`
      : `Ready to advance to ${next.name}!`;
  }
}

// Name hydration
function bestNameFromFirebase(u){
  if (!u || typeof u !== 'object') return null;
  const p = u.profile || {};
  const direct = u.displayName || u.name || u.nickname || u.username;
  const prof = p.displayName || p.name || p.nickname || p.username;
  const first = u.firstName || p.firstName || (u.first_name) || null;
  const last  = u.lastName  || p.lastName  || (u.last_name)  || null;

  if (direct) return String(direct);
  if (prof) return String(prof);
  const combo = [first,last].filter(Boolean).join(' ').trim();
  if (combo) return combo;
  return null;
}
async function hydrateName(){
  try{
    const snap = await db.ref('users/'+userId).once('value');
    const u = snap.val();
    const n = bestNameFromFirebase(u);
    if (n){ nameEl.textContent = n; try{ await idbSet(`wlc:${userId}:tgName`, n); }catch{} }
  }catch{}

  try{
    const cachedName = await idbGet(`wlc:${userId}:tgName`);
    if (cachedName && !/^\s*$/.test(String(cachedName))) {
      nameEl.textContent = cachedName;
    }
  }catch{}

  const tgFull = [tgUser?.first_name||'', tgUser?.last_name||''].filter(Boolean).join(' ').trim();
  const tgHandle = tgUser?.username ? '@'+tgUser.username : '';
  const fallback = tgFull || tgHandle || 'Player';
  if (nameEl.textContent === 'Player' || nameEl.textContent.trim() === ''){
    nameEl.textContent = fallback;
  }

  try{
    db.ref('users/'+userId).on('value', s=>{
      const nu = s.val();
      const n2 = bestNameFromFirebase(nu);
      if (n2 && nameEl.textContent !== n2){
        nameEl.textContent = n2;
        idbSet(`wlc:${userId}:tgName`, n2).catch(()=>{});
      }
    });
  }catch{}
}

// Daily tasks open/close
function openTasks(){
  try{
    go('start.html'); // open dedicated start.html
  }catch(e){
    window.location.href = 'start.html';
  }
}
function closeTasks(){
  tasksModal.style.display = 'none';
  try{ tasksFrame.src = 'about:blank'; }catch{}
}

// WELLcoin links
function openWellcoin(){
  const url = 'https://wellcoin.lol';
  try{
    if (tg && typeof tg.openLink === 'function') tg.openLink(url, { try_instant_view:false });
    else window.open(url,'_blank');
  }catch{ window.open(url,'_blank'); }
}

// Referral earnings (10% every 24h per friend)
const ONE_DAY = 24*3600*1000;
const refUnsubs = new Map(); // friendId -> { bal:fn, led:fn, user:fn }

function clearInvitesUI(){
  invitesEl.innerHTML = '';
  for (const [fid, fns] of refUnsubs){
    try{ fns.bal && fns.bal(); }catch{}
    try{ fns.led && fns.led(); }catch{}
    try{ fns.user && fns.user(); }catch{}
  }
  refUnsubs.clear();
}

function createInviteRow(friendId){
  const row = document.createElement('div'); row.className='inv-row'; row.dataset.id = String(friendId);
  const nameBox = document.createElement('div'); nameBox.className='inv-name';
  const lbl = document.createElement('div'); lbl.className='label'; lbl.textContent = 'Friend';
  const muted = document.createElement('div'); muted.className='muted'; muted.textContent = '@';
  nameBox.appendChild(lbl); nameBox.appendChild(muted);

  const chip = document.createElement('div'); chip.className='inv-chip'; chip.textContent = '0.000000 WLC';
  const btn = document.createElement('button'); btn.className='inv-claim'; btn.textContent='Claim'; btn.disabled = true;

  row.appendChild(nameBox); row.appendChild(chip); row.appendChild(btn);
  invitesEl.appendChild(row);

  return { row, nameBox, lbl, muted, chip, btn };
}

function ensureLedgerTransaction(inviterId, friendId, friendBalance){
  const tNow = now();
  const ref = db.ref(`referralsLedger/${inviterId}/${friendId}`);
  return ref.transaction(L=>{
    L = L || { lastSettledAt: 0, lastSnapshotBalance: 0, pendingWLC: 0 };
    const lastSet = Number(L.lastSettledAt||0);
    if (!lastSet){
      L.lastSettledAt = tNow;
      L.lastSnapshotBalance = Number(friendBalance||0);
      return L;
    }
    if (tNow - lastSet >= ONE_DAY){
      const prevSnap = Number(L.lastSnapshotBalance||0);
      const delta = Number(friendBalance||0) - prevSnap;
      const accr = delta > 0 ? (delta * 0.10) : 0;
      L.pendingWLC = Number(L.pendingWLC||0) + (accr>0?accr:0);
      L.lastSettledAt = tNow;
      L.lastSnapshotBalance = Number(friendBalance||0);
      return L;
    }
    return L;
  });
}

function subscribeInvite(friendId){
  const { lbl, muted, chip, btn } = createInviteRow(friendId);

  // Friend display name
  const userRef = db.ref('users/'+friendId);
  const userHandler = s=>{
    const u = s.val()||{};
    const name = bestNameFromFirebase(u) || 'Friend';
    lbl.textContent = name;
    const uname = u?.username || u?.profile?.username || '';
    muted.textContent = uname ? ('@'+String(uname).replace(/^@+/,'') ) : '';
  };
  userRef.on('value', userHandler);

  // Ledger UI
  const ledRef = db.ref(`referralsLedger/${userId}/${friendId}`);
  const ledHandler = s=>{
    const L = s.val() || { pendingWLC: 0 };
    const pend = Number(L.pendingWLC||0);
    chip.textContent = `${fmtWLC(pend)} WLC`;
    btn.disabled = !(pend > 0);
  };
  ledRef.on('value', ledHandler);

  // Friend balance watcher
  const balRef = db.ref('users/'+friendId+'/balance');
  const balHandler = async sv=>{
    const fb = typeof sv.val()==='number' ? sv.val() : 0;
    try{ await ensureLedgerTransaction(userId, friendId, fb); }catch(e){}
  };
  balRef.on('value', balHandler);

  // Claim
  btn.addEventListener('click', async ()=>{
    try{
      const snap = await ledRef.once('value');
      const L = snap.val() || {};
      const pend = Number(L.pendingWLC||0);
      if (!(pend > 0)) return;
      await db.ref('users/'+userId+'/balance').transaction(v => (typeof v==='number'?v:Number(v||0)) + pend);
      await ledRef.update({ pendingWLC: 0, lastClaimAt: firebase.database.ServerValue.TIMESTAMP });
    }catch(e){}
  });

  // Unsubs
  refUnsubs.set(String(friendId), {
    bal: ()=> balRef.off('value', balHandler),
    led: ()=> ledRef.off('value', ledHandler),
    user:()=> userRef.off('value', userHandler)
  });
}

function loadInvites(){
  clearInvitesUI();
  const r = db.ref('referrals/'+userId);
  r.on('value', async s=>{
    clearInvitesUI();
    const val = s.val() || {};
    const ids = Object.keys(val);
    if (!ids.length){
      invitesEmptyEl.style.display = '';
      return;
    }
    invitesEmptyEl.style.display = 'none';
    ids.forEach(fid=> subscribeInvite(fid));
  });
}

// Init
function init(){
  try{
    sessionStorage.setItem('wlc_user_id', String(userId));
    localStorage.setItem('wlc_user_id', String(userId));
  }catch{}

  hydrateName();

  (async ()=>{
    const cached = await idbGet(`wlc:${userId}:balance`).catch(()=>null);
    if (typeof cached === 'number'){
      wlcEl.textContent = fmtWLC(cached);
      updateRankUI(cached);
    } else {
      updateRankUI(0);
    }
  })();

  const userRef = db.ref('users/'+userId);
  db.ref('users/'+userId+'/balance').on('value', s=>{
    const v = typeof s.val()==='number' ? s.val() : 0;
    wlcEl.textContent = fmtWLC(v);
    idbSet(`wlc:${userId}:balance`, v).catch(()=>{});
    updateRankUI(v);
  });
  db.ref('users/'+userId+'/usdtBalance').on('value', s=>{
    const v = typeof s.val()==='number' ? s.val() : 0;
    usdtEl.textContent = fmtUSD(v);
  });

  // Withdraw popups (custom)
  document.getElementById('wlc-withdraw').addEventListener('click', showWithdrawInfo);
  document.getElementById('usdt-withdraw').addEventListener('click', showWithdrawInfo);

  // Start button -> start.html
  const earnBtn = document.getElementById('start-earn');
  if (earnBtn) earnBtn.addEventListener('click', openTasks);
  if (tasksClose) tasksClose.addEventListener('click', closeTasks);
  tasksModal?.addEventListener('click', (e)=>{ if (e.target === tasksModal) closeTasks(); });

  // Final links
  document.getElementById('btn-about')?.addEventListener('click', openWellcoin);
  document.getElementById('btn-more')?.addEventListener('click', openWellcoin);

  // Daily achievements logic
  sync(userRef).catch(console.warn);
  attachTileHandlers(userRef);

  // Invited list
  loadInvites();
}

ensureUserId(init);
