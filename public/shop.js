// WELLcoin Shop - Advanced Logic by Copilot

// ========== CONFIG ==========
const SHOP_PRODUCTS = [
  { id: "suit",        name: "Elegant Suit",         img: "assets/suit.png",      price: 10,   mining: 0.000001,  character: "character1.png"   },
  { id: "house",       name: "House Decoration",     img: "assets/house.png",     price: 15,   mining: 0.000002,  character: "character2.png"   },
  { id: "fitness",     name: "Fitness Equipment",    img: "assets/fitness.jpg",   price: 20,   mining: 0.000003,  character: "character3.png"   },
  { id: "computer",    name: "Computer",             img: "assets/computer.png",  price: 15,   mining: 0.000003,  character: "character4.png"   },
  { id: "iphone15",    name: "iPhone 15",            img: "assets/iphone15.jpg",  price: 15,   mining: 0.000003,  character: "character5.png"   },
  { id: "shop",        name: "Business Property",    img: "assets/shop.jpg",      price: 70,   mining: 0.000007,  shopIcon: true },
  { id: "bmwcar",      name: "BMW Car",              img: "assets/bmwcar.jpg",    price: 100,  mining: 0.000009,  shopIcon: true },
  { id: "gangsterhat", name: "Gangster Hat",         img: "assets/gangsterhat.jpg",price: 18,  mining: 0.0000025, character: "character6.png"  },
  { id: "royalthrone", name: "Royal Throne",         img: "assets/royalthrone.jpg",price: 200, mining: 0.00001,   character: "character7.png"  },
  { id: "wife",        name: "Get a Wife",           img: "assets/wife.jpg",      price: 500,  mining: 0.000025,  character: "character8.png"  },
  { id: "clock",       name: "Luxury Wall Clock",    img: "assets/clock.jpg",     price: 80,   mining: 0.000008,  character: "character9.png"  },
  { id: "pitbull",     name: "Pitbull Dog",          img: "assets/pitbull.jpg",   price: 400,  mining: 0.000025,  character: "character10.png" },
  { id: "ak",          name: "AK Weapon",            img: "assets/ak.jpg",        price: 700,  mining: 0.000037,  character: "character11.png" },
  { id: "bodyguards",  name: "Bodyguards",           img: "assets/bodyguards.jpg",price: 900,  mining: 0.000050,  character: "character12.png" },
  { id: "yacht",       name: "Yacht",                img: "assets/yacht.jpg",     price: 1000, mining: 0.000060,  shopIcon: true },
  { id: "helicopter",  name: "Private Helicopter",   img: "assets/helicopter.jpg",price: 1200, mining: 0.000073,  shopIcon: true },
  { id: "palace",      name: "Palace",               img: "assets/palace.png",    price: 3000, mining: 0.001,     character: "character13.png" },
];

// ========== FIREBASE INIT ==========
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
if (!userId) {
  window.location.href = "welcome.html";
}

// ========== GLOBAL DATA ==========
let userBalance = 0;
let userShopData = {};
let balanceRef = db.ref("users/" + userId + "/balance");
let shopDataRef = db.ref("users/" + userId + "/shopItems");

// ========== UTILS ==========
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

// بعض الداتا القديمة قد تكون shopItems/itemId = true وليس {bought:true}
function hasBought(entry) {
  return !!(entry && (entry === true || entry.bought === true));
}

// ========== POPUP MODAL LOGIC ==========
const popupRoot = document.getElementById("popup-modal-root");
function closePopup() { popupRoot.innerHTML = ""; }
function showPopup({title, desc, actions, onClose}) {
  popupRoot.innerHTML = `
    <div class="popup-modal">
      <div class="popup-box">
        <span class="popup-close" id="popup-close">&times;</span>
        <div class="popup-title">${title || ""}</div>
        <div class="popup-desc">${desc || ""}</div>
        ${actions || ""}
      </div>
    </div>
  `;
  document.getElementById("popup-close").onclick = () => { closePopup(); onClose && onClose(); };
}
function showOkeyPopup({title, desc}) {
  showPopup({
    title,
    desc,
    actions: `<button class="popup-okey-btn" id="popup-okey-btn">Okey</button>`
  });
  document.getElementById("popup-okey-btn").onclick = closePopup;
}

// ========== ORDER ENFORCEMENT ==========
function getIndexById(id) {
  return SHOP_PRODUCTS.findIndex(x => x.id === id);
}
function getPrevProduct(product) {
  const idx = getIndexById(product.id);
  if (idx > 0) return SHOP_PRODUCTS[idx - 1];
  return null;
}
function ensureOrderOrPopup(product) {
  const prev = getPrevProduct(product);
  if (!prev) return true; // أول عنصر مسموح
  if (hasBought(userShopData[prev.id])) return true;
  showOkeyPopup({
    title: "Purchase Order Required",
    desc: `You must buy <b>${prev.name}</b> first.<br>
           <img src="${prev.img}" alt="${prev.name}" style="width:220px;height:auto;margin-top:12px;border-radius:10px;box-shadow:0 0 12px #000, 0 0 6px #ffd70088;">`
  });
  return false;
}

// ========== RENDER SHOP ==========
function renderShop() {
  const container = document.getElementById("shop-container");
  container.innerHTML = "";
  for (let i = 0; i < SHOP_PRODUCTS.length; ++i) {
    const p = SHOP_PRODUCTS[i];
    const data = userShopData[p.id] || {};
    let html = `
      <div class="item-box" data-id="${p.id}">
        <img src="${p.img}" alt="${p.name}" />
        <div class="divider"></div>
        <div class="item-name">${p.name}</div>
        <div class="divider-bottom"></div>
        <div class="item-details">
          <span>${p.price} WLC</span>
          <div class="vertical-line"></div>
          <span>+${formatWLC(p.mining)}/day</span>
        </div>
    `;

    if (hasBought(data)) {
      const {timeLeft, mined} = getMiningStatus(p, data);
      const can = isClaimable(data);
      html += `
        <div class="shop-stats-row">
          <span class="shop-timer" id="timer-${p.id}">${timeLeft > 0 ? formatTimeLeft(timeLeft) : "00:00:00"}</span>
          <span class="shop-mining" id="mining-${p.id}">${formatWLC(mined)}</span>
        </div>
        <div class="shop-claim-row">
          <button class="claim-btn${can ? "" : " disabled"}" id="claim-${p.id}" ${can ? "" : "disabled"}>Claim</button>
        </div>
      `;
    } else {
      html += `<button class="buy-btn" id="buy-${p.id}">Buy</button>`;
    }
    html += "</div>";
    container.innerHTML += html;
  }
  // Connect events
  for (let i = 0; i < SHOP_PRODUCTS.length; ++i) {
    const p = SHOP_PRODUCTS[i];
    if (!hasBought(userShopData[p.id])) {
      let btn = document.getElementById(`buy-${p.id}`);
      if (btn) btn.onclick = () => onBuyPressed(p);
    } else {
      let btn = document.getElementById(`claim-${p.id}`);
      if (btn) btn.onclick = () => onClaimPressed(p, userShopData[p.id]);
    }
  }
}

// ========== BUY LOGIC ==========
function onBuyPressed(product) {
  // فحص الترتيب سريع + Popup
  if (!ensureOrderOrPopup(product)) return;

  if (userBalance < product.price) {
    showOkeyPopup({
      title: "Insufficient Balance",
      desc: `You do not have enough WLC to buy this product.<br>Your balance: <span style="color:#ffd700">${formatWLC(userBalance)} WLC</span><br>Required: <span style="color:#ff6666">${product.price} WLC</span>`
    });
    return;
  }
  showPopup({
    title: "Confirm Purchase",
    desc: `You are about to spend <b style="color:#ffd700">${product.price} WLC</b> from your balance to buy <b>${product.name}</b>.<br>You will start mining <b style="color:#0cf">+${formatWLC(product.mining)} WLC/day</b>.`,
    actions: `<button class="popup-action-btn" id="popup-buy-confirm">Buy</button>`
  });
  document.getElementById("popup-buy-confirm").onclick = async () => {
    closePopup();
    await handleBuy(product);
  };
}

async function handleBuy(product) {
  // إعادة فحص الترتيب ضد الداتا الحية لمنع أي تجاوز
  const prev = getPrevProduct(product);
  if (prev) {
    const prevNode = await db.ref(`users/${userId}/shopItems/${prev.id}`).once("value");
    const prevBought = hasBought(prevNode.val());
    if (!prevBought) {
      showOkeyPopup({
        title: "Purchase Order Required",
        desc: `You must buy <b>${prev.name}</b> first.<br>
               <img src="${prev.img}" alt="${prev.name}" style="width:220px;height:auto;margin-top:12px;border-radius:10px;box-shadow:0 0 12px #000, 0 0 6px #ffd70088;">`
      });
      return;
    }
  }

  // رصيد لحظي
  const balSnap = await db.ref("users/" + userId + "/balance").once("value");
  const liveBalance = typeof balSnap.val() === "number" ? balSnap.val() : 0;
  if (liveBalance < product.price) {
    showOkeyPopup({
      title: "Insufficient Balance",
      desc: `You do not have enough WLC to buy this product.<br>Your balance: <span style="color:#ffd700">${formatWLC(liveBalance)} WLC</span><br>Required: <span style="color:#ff6666">${product.price} WLC</span>`
    });
    return;
  }

  // تنفيذ الشراء
  const now = Date.now();
  let updates = {};
  updates[`users/${userId}/balance`] = liveBalance - product.price;
  updates[`users/${userId}/shopItems/${product.id}`] = {
    bought: true,
    startTime: now,
    claimed: false
  };
  await db.ref().update(updates);

  // تحديث محلي
  userBalance = liveBalance - product.price;
  userShopData[product.id] = { bought: true, startTime: now, claimed: false };
  renderShop();
}

// ========== MINING & CLAIM LOGIC ==========
const MINING_DURATION = 24 * 60 * 60 * 1000; // 24h

function getMiningStatus(product, data) {
  const entry = data || {};
  if (!hasBought(entry)) return { timeLeft: 0, mined: 0 };
  const now = Date.now();
  const start = entry.startTime || now;
  const elapsed = Math.min(now - start, MINING_DURATION);
  const mined = product.mining * (elapsed / MINING_DURATION);
  const timeLeft = Math.max(0, (start + MINING_DURATION) - now);
  return { timeLeft, mined };
}
function isClaimable(data) {
  const entry = data || {};
  if (!hasBought(entry)) return false;
  const now = Date.now();
  return now - (entry.startTime || 0) >= MINING_DURATION;
}

function onClaimPressed(product, data) {
  const { timeLeft } = getMiningStatus(product, data);
  if (timeLeft > 0) {
    showOkeyPopup({
      title: "Cannot Claim Yet",
      desc: `You can claim your mined amount after <b style="color:#ffd700">${formatTimeLeft(timeLeft)}</b>.`
    });
    return;
  }
  showPopup({
    title: "Claim Mining Reward",
    desc: `You will claim <b style="color:#0cf">+${formatWLC(product.mining)} WLC</b> into your balance and mining will restart.`,
    actions: `<button class="popup-action-btn" id="popup-claim-confirm">Claim</button>`
  });
  document.getElementById("popup-claim-confirm").onclick = async () => {
    closePopup();
    await handleClaim(product);
  };
}

async function handleClaim(product) {
  const balSnap = await db.ref("users/" + userId + "/balance").once("value");
  const currentBal = typeof balSnap.val() === "number" ? balSnap.val() : 0;
  const now = Date.now();
  let updates = {};
  updates[`users/${userId}/balance`] = currentBal + product.mining;
  updates[`users/${userId}/shopItems/${product.id}/startTime`] = now; // restart mining
  updates[`users/${userId}/shopItems/${product.id}/claimed`] = false;
  await db.ref().update(updates);

  if (!userShopData[product.id]) userShopData[product.id] = { bought: true };
  userShopData[product.id].startTime = now;
  userShopData[product.id].claimed = false;
  renderShop();

  showOkeyPopup({
    title: "Claimed!",
    desc: `You received <b style="color:#0cf">+${formatWLC(product.mining)} WLC</b>.<br>Mining restarted for the next 24 hours.`
  });
}

// ========== LOAD USER DATA & LIVE UPDATE ==========
function listenForChanges() {
  balanceRef.on("value", snap => {
    if (typeof snap.val() === "number") userBalance = snap.val();
  });
  shopDataRef.on("value", snap => {
    userShopData = snap.val() || {};
    renderShop();
  });
}

// ========== COUNTDOWN INTERVALS ==========
setInterval(() => {
  for (let i = 0; i < SHOP_PRODUCTS.length; ++i) {
    const p = SHOP_PRODUCTS[i];
    const data = userShopData[p.id];
    if (hasBought(data)) {
      const { timeLeft, mined } = getMiningStatus(p, data);
      let timerEl = document.getElementById(`timer-${p.id}`);
      let miningEl = document.getElementById(`mining-${p.id}`);
      let claimBtn = document.getElementById(`claim-${p.id}`);
      if (timerEl) timerEl.textContent = timeLeft > 0 ? formatTimeLeft(timeLeft) : "00:00:00";
      if (miningEl) miningEl.textContent = formatWLC(mined);
      if (claimBtn) {
        const can = isClaimable(data);
        claimBtn.disabled = !can;
        claimBtn.classList.toggle("disabled", !can);
      }
    }
  }
}, 1000);

// ========== INIT ==========
listenForChanges();
renderShop();
