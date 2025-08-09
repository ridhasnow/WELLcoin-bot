// WELLcoin Shop - Advanced Logic by Copilot

// ========== CONFIG ==========

// Define your products here in the same order as displayed in shop.html
const SHOP_PRODUCTS = [
  // id, name, image, price, miningPerDay
  { id: "suit",        name: "Elegant Suit",         img: "assets/suit.png",      price: 10,   mining: 0.000001,  character: "character1.png"   },
  { id: "house",       name: "House Decoration",     img: "assets/house.png",     price: 15,   mining: 0.000002,  character: "character2.png"   },
  { id: "fitness",     name: "Fitness Equipment",    img: "assets/fitness.jpg",   price: 20,   mining: 0.000003,  character: "character3.png"   },
  { id: "computer",    name: "Computer",             img: "assets/computer.png",  price: 15,   mining: 0.000003,  character: "character4.png"   },
  { id: "iphone15",    name: "iPhone 15",            img: "assets/iphone15.jpg",  price: 15,   mining: 0.000003,  character: "character5.png"   },
  // Floating icon products (shopIcon: true)
  { id: "shop",        name: "Business Property",    img: "assets/shop.jpg",      price: 70,   mining: 0.000007,  shopIcon: true },
  { id: "bmwcar",      name: "BMW Car",              img: "assets/bmwcar.jpg",    price: 100,  mining: 0.000009,  shopIcon: true },
  { id: "gangsterhat", name: "Gangster Hat",         img: "assets/gangsterhat.jpg",price: 18,  mining: 0.0000025, character: "character6.png"  },
  { id: "royalthrone", name: "Royal Throne",         img: "assets/royalthrone.jpg",price: 200, mining: 0.00001,   character: "character7.png"  },
  { id: "wife",        name: "Get a Wife",           img: "assets/wife.jpg",      price: 500,  mining: 0.000025,  character: "character8.png"  },
  { id: "clock",       name: "Luxury Wall Clock",    img: "assets/clock.jpg",     price: 80,   mining: 0.000008,  character: "character9.png"  },
  { id: "pitbull",     name: "Pitbull Dog",          img: "assets/pitbull.jpg",   price: 400,  mining: 0.000025,  character: "character10.png" },
  { id: "ak",          name: "AK Weapon",            img: "assets/ak.jpg",        price: 700,  mining: 0.000037,  character: "character11.png" },
  { id: "bodyguards",  name: "Bodyguards",           img: "assets/bodyguards.jpg",price: 900,  mining: 0.000050,  character: "character12.png" },
  // Floating icon products
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
let userShopData = {}; // { [productId]: { bought, startTime, claimed, mined, lastMined } }
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

// ========== POPUP MODAL LOGIC ==========

const popupRoot = document.getElementById("popup-modal-root");
function closePopup() {
  popupRoot.innerHTML = "";
}
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
    actions: `<button class="popup-okey-btn" id="popup-okey-btn">Okey</button>`,
    onClose: null
  });
  document.getElementById("popup-okey-btn").onclick = closePopup;
}

// ========== RENDER SHOP ==========

function renderShop() {
  const container = document.getElementById("shop-container");
  container.innerHTML = "";
  for (let i = 0; i < SHOP_PRODUCTS.length; ++i) {
    const p = SHOP_PRODUCTS[i];
    // Get user data for this product
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

    // Already bought
    if (data.bought) {
      // Mining status
      const claimable = isClaimable(data);
      // Calculate mining progress
      const {timeLeft, mined} = getMiningStatus(p, data);
      html += `
        <div class="shop-timer-row">
          <span class="shop-timer" id="timer-${p.id}">${timeLeft > 0 ? formatTimeLeft(timeLeft) : "00:00:00"}</span>
          <span class="shop-mining" id="mining-${p.id}">${formatWLC(mined)}</span>
          <button class="claim-btn${claimable ? "" : " disabled"}" id="claim-${p.id}" ${claimable ? "" : "disabled"}>Claim</button>
        </div>
      `;
    } else {
      // Not bought yet
      html += `
        <button class="buy-btn" id="buy-${p.id}">Buy</button>
      `;
    }
    html += "</div>";
    container.innerHTML += html;
  }
  // Connect events
  for (let i = 0; i < SHOP_PRODUCTS.length; ++i) {
    const p = SHOP_PRODUCTS[i];
    // Buy
    if (!userShopData[p.id]?.bought) {
      let btn = document.getElementById(`buy-${p.id}`);
      if (btn) btn.onclick = () => onBuyPressed(p);
    } else {
      // Claim
      let btn = document.getElementById(`claim-${p.id}`);
      if (btn) btn.onclick = () => onClaimPressed(p, userShopData[p.id]);
    }
  }
}

// ========== BUY LOGIC ==========

function onBuyPressed(product) {
  // Check balance
  if (userBalance < product.price) {
    showOkeyPopup({
      title: "Insufficient Balance",
      desc: `You do not have enough WLC to buy this product.<br>Your balance: <span style="color:#ffd700">${formatWLC(userBalance)} WLC</span><br>Required: <span style="color:#ff6666">${product.price} WLC</span>`
    });
    return;
  }
  // Show confirmation popup
  showPopup({
    title: "Confirm Purchase",
    desc: `You are about to spend <b style="color:#ffd700">${product.price} WLC</b> from your balance to buy <b>${product.name}</b>.<br>You will start mining <b style="color:#0cf">+${formatWLC(product.mining)} WLC/day</b>.`,
    actions: `<button class="popup-action-btn" id="popup-buy-confirm">Buy</button>`,
    onClose: null
  });
  document.getElementById("popup-buy-confirm").onclick = async () => {
    closePopup();
    await handleBuy(product);
  };
}

async function handleBuy(product) {
  // Check again (race condition)
  if (userBalance < product.price) {
    showOkeyPopup({
      title: "Insufficient Balance",
      desc: `You do not have enough WLC to buy this product.<br>Your balance: <span style="color:#ffd700">${formatWLC(userBalance)} WLC</span><br>Required: <span style="color:#ff6666">${product.price} WLC</span>`
    });
    return;
  }
  // Deduct balance, mark as bought, start mining
  const now = Date.now();
  let updates = {};
  updates[`users/${userId}/balance`] = userBalance - product.price;
  updates[`users/${userId}/shopItems/${product.id}`] = {
    bought: true,
    startTime: now,
    claimed: false,
    mined: 0,
    lastMined: now
  };
  await db.ref().update(updates);
  userBalance -= product.price;
  userShopData[product.id] = {
    bought: true,
    startTime: now,
    claimed: false,
    mined: 0,
    lastMined: now
  };
  renderShop();
}

// ========== MINING & CLAIM LOGIC ==========

const MINING_DURATION = 24 * 60 * 60 * 1000; // 24h in ms

function getMiningStatus(product, data) {
  // Returns {timeLeft, mined}
  if (!data?.bought) return { timeLeft: 0, mined: 0 };
  const now = Date.now();
  const start = data.startTime || now;
  const lastMined = data.lastMined || start;
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

function onClaimPressed(product, data) {
  // If not ready yet
  const { timeLeft, mined } = getMiningStatus(product, data);
  if (timeLeft > 0) {
    showOkeyPopup({
      title: "Cannot Claim Yet",
      desc: `You can claim your mined amount after <b style="color:#ffd700">${formatTimeLeft(timeLeft)}</b>.`
    });
    return;
  }
  // Ready to claim
  showPopup({
    title: "Claim Mining Reward",
    desc: `You will claim <b style="color:#0cf">+${formatWLC(product.mining)} WLC</b> into your balance.`,
    actions: `<button class="popup-action-btn" id="popup-claim-confirm">Claim</button>`,
    onClose: null
  });
  document.getElementById("popup-claim-confirm").onclick = async () => {
    closePopup();
    await handleClaim(product, data);
  };
}

async function handleClaim(product, data) {
  // Add to balance, mark as claimed
  let updates = {};
  updates[`users/${userId}/balance`] = userBalance + product.mining;
  updates[`users/${userId}/shopItems/${product.id}/claimed`] = true;
  await db.ref().update(updates);
  userBalance += product.mining;
  userShopData[product.id].claimed = true;
  renderShop();
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
    if (data && data.bought) {
      // Update timer and mining amount live
      const { timeLeft, mined } = getMiningStatus(p, data);
      let timerEl = document.getElementById(`timer-${p.id}`);
      let miningEl = document.getElementById(`mining-${p.id}`);
      let claimBtn = document.getElementById(`claim-${p.id}`);
      if (timerEl) timerEl.textContent = timeLeft > 0 ? formatTimeLeft(timeLeft) : "00:00:00";
      if (miningEl) miningEl.textContent = formatWLC(mined);
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
  }
}, 1000);

// ========== INIT ==========

listenForChanges();
renderShop();

// ========== EXPORT FOR INDEX.HTML (عند الربط لاحقاً) ==========
// بعد الانتهاء من ربط shop.js بشكل كامل يمكنك إضافة دوال تصدير هنا أو في ملف آخر حسب الحاجة.
