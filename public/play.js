// === Firebase & Telegram ===
const firebaseConfig = {
  apiKey: "AIzaSyB9uNwUURvf5RsD7CnsG2LtE6fz5yboBkw",
  authDomain: "wellcoinbotgame.firebaseapp.com",
  databaseURL: "https://wellcoinbotgame-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wellcoinbotgame",
  storageBucket: "wellcoinbotgame.appspot.com",
  messagingSenderId: "108640533638",
  appId: "1:108640533638:web:ed07516d96ac38f47f6507"
};
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database(app);

const tg = window.Telegram.WebApp;
tg.ready();
const userId = tg.initDataUnsafe?.user?.id;

// === Health System (Hearts) ===
let maxHearts = 3;

// =========== استرجاع رصيد العملات والقلوب من localStorage ===========
let sessionBalance = 0;
let currentHearts = maxHearts;
let sessionActive = true;

// ====== إصلاح localStorage: بداية جلسة نظيفة دائماً =======
function initSessionStorage() {
  localStorage.setItem("sessionBalance", "0");
  localStorage.setItem("currentHearts", maxHearts);
  localStorage.setItem("sessionStarted", "1");
}
if (
  !localStorage.getItem("sessionStarted") ||
  isNaN(parseFloat(localStorage.getItem("sessionBalance"))) ||
  isNaN(parseInt(localStorage.getItem("currentHearts"))) ||
  parseFloat(localStorage.getItem("sessionBalance")) < 0 ||
  parseInt(localStorage.getItem("currentHearts")) > maxHearts ||
  parseInt(localStorage.getItem("currentHearts")) < 0
) {
  initSessionStorage();
}
sessionBalance = parseFloat(localStorage.getItem("sessionBalance") || "0");
currentHearts = parseInt(localStorage.getItem("currentHearts") || maxHearts);

let lastPlayerHitTime = 0;
let warningActive = false;

// === COOL DOWN نظام الانتظار بعد نهاية الجولة ===
const GAME_COOLDOWN_HOURS = 5;
const GAME_COOLDOWN_MS = GAME_COOLDOWN_HOURS * 60 * 60 * 1000;
// فايربيز فقط: لا تستعمل localStorage بعد الآن
const COOLDOWN_KEY_FIREBASE = "nextPlayTime";

// Firebase: احصل على توقيت نهاية الانتظار من حساب اللاعب
async function getCooldownTimestampFirebase() {
  if (!userId) return 0;
  const snap = await db.ref("users/" + userId + "/" + COOLDOWN_KEY_FIREBASE).get();
  return parseInt(snap.val() || "0");
}
// Firebase: عداد الواجهة
function showCooldownOverlay(remainingMs) {
  let overlay = document.getElementById("cooldown-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "cooldown-overlay";
    overlay.innerHTML = `
      <div class="cooldown-box" style="
        background:rgba(18,14,32,0.98);padding:38px 32px 32px 32px;
        border-radius: 24px; box-shadow: 0 8px 48px #000a; max-width: 350px; min-width: 260px;">
        <img src="assets/player1.png" alt="player" style="width:72px;height:72px;display:block;margin:0 auto 20px;">
        <h2 style="text-align:center;color:#e14b4b;margin:0 0 10px 0;font-family:Pixel,Arial">⏳ الرجاء الانتظار</h2>
        <div style="text-align:center;font-size:28px;font-family:monospace;color:#fff;margin-bottom:10px;">
          <span id="cooldown-timer">00:00:00</span>
        </div>
        <div style="text-align:center;color:#d5d5d5;font-size:17px;">يمكنك اللعب مرّة أخرى بعد انتهاء العد التنازلي!</div>
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
  function updateTimer() {
    let msLeft = window._nextPlayTime - Date.now();
    if (msLeft <= 0) {
      overlay.style.display = "none";
    } else {
      document.getElementById("cooldown-timer").textContent = msToHMS(msLeft);
      setTimeout(updateTimer, 1000);
    }
  }
  updateTimer();
}
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

// === UI Helpers ===
function updateHeartsUI() {
  let heartsBar = document.getElementById('hearts-bar');
  let warningHearts = document.getElementById('warning-hearts');
  if (!heartsBar || !warningHearts) return;
  let heartsHtml = '';
  let warningHtml = '';
  for (let i = 0; i < maxHearts; i++) {
    let isActive = i < currentHearts;
    let heartSrc = isActive ? 'assets/heart_pixel_red.png' : 'assets/heart_pixel_grey.png';
    heartsHtml += `<img src="${heartSrc}" class="pixel-heart${isActive ? '' : ' grey'}" style="width:32px;height:32px;margin:0 2px;">`;
    warningHtml += `<img src="${heartSrc}" class="pixel-heart${isActive ? '' : ' grey'}" style="width:48px;height:48px;margin:0 6px;">`;
  }
  heartsBar.innerHTML = heartsHtml;
  warningHearts.innerHTML = warningHtml;
}

function setBalance(val) {
  document.getElementById('balance-value').textContent = Number(val).toFixed(8);
}

const gameWidth = window.innerWidth;
const gameHeight = window.innerHeight;

let player, camera, bg, bgWidth, bgHeight;
let joystickPointerId = null, joyActive = false, joyOrigin = {x:0,y:0}, joyDelta = {x:0,y:0};
let enemies = [], enemySpeed1=0, enemySpeed2=0, lastFireTime=0;
let bulletsGroup, coinsGroup, coinAnimDuration=800, balanceValue=0, lastEnemyWaveTime=0;
let enemy1Key='enemy1', enemy2Key='enemy2', enemyBulletGroup;
let waveCount = 1;
let enemy1AttackFrames = ['enemy1-attack1.png', 'enemy1-attack2.png'];
let isPlayerDying = false;

class MainScene extends Phaser.Scene {
  constructor() { super('MainScene'); }
  preload() {
    this.load.image('city', 'assets/city1.png');
    this.load.image('player', 'assets/player1.png');
    this.load.image(enemy1Key, 'assets/enemy1.png');
    this.load.image(enemy2Key, 'assets/enemy2.png');
    this.load.image('kartoucha', 'assets/kartoucha.png');
    this.load.image('wlc', 'assets/wlc.png');
    this.load.image('enemy1-attack1', 'assets/enemy1-attack1.png');
    this.load.image('enemy1-attack2', 'assets/enemy1-attack2.png');
    this.load.image('heart_pixel_red', 'assets/heart_pixel_red.png');
    this.load.image('heart_pixel_grey', 'assets/heart_pixel_grey.png');
    this.load.image('gun_fire', 'assets/gun_fire_pixel.gif');
    this.load.image('player_hit', 'assets/gun_fire_pixel.gif');
  }
  create() {
    cleanAllGameObjects(this);
    resetGameCamera(this);

    bg = this.add.image(0, 0, 'city');
    bgWidth = bg.width; bgHeight = bg.height;
    bg.setPosition(bgWidth/2, bgHeight/2);

    player = this.physics.add.sprite(bgWidth/2, bgHeight/2, 'player').setScale(0.11);
    player.setDepth(2).setCollideWorldBounds(true);
    player.body.enable = true;
    player.setScale(0.11, 0.11);

    let playerRadius = player.displayWidth / 2.2;
    player.body.setCircle(playerRadius, player.body.width/2 - playerRadius, player.body.height/2 - playerRadius);

    this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
    this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);
    this.cameras.main.startFollow(player, true, 0.14, 0.14);

    this.cameras.main.setZoom(Math.max(gameWidth/bgWidth, gameHeight/bgHeight)*1.35);
    camera = this.cameras.main;

    this.scale.on('resize', () => {
      this.cameras.main.setZoom(Math.max(gameWidth/bgWidth, gameHeight/bgHeight)*1.35);
    });

    this.input.manager.canvas.addEventListener('contextmenu', e => e.preventDefault());
    setupJoystick();

    prepareSession();

    this.enemyGroup = this.physics.add.group();
    this.bulletsGroup = this.physics.add.group();
    this.enemyBulletGroup = this.physics.add.group();
    this.coinsGroup = this.physics.add.group();
    bulletsGroup = this.bulletsGroup;
    coinsGroup = this.coinsGroup;
    enemyBulletGroup = this.enemyBulletGroup;
    enemies = [];

    this.physics.add.overlap(this.bulletsGroup, this.enemyGroup, (bullet, enemy) => {
      if (bullet.active && enemy.active) {
        bullet.disableBody(true, true);
        killEnemy(enemy, this);
      }
    });

    // === تصادم: أول رصاصة تلمس اللاعب تقتله فوراً مهما كان يجري ===
    this.events.on('update', () => {
      if (!player.active || isPlayerDying) return;
      enemyBulletGroup.children.each(bullet => {
        if (!bullet.active) return;
        let bulletRadius = bullet.displayWidth / 2.2;
        bullet.body.setCircle(bulletRadius, bullet.body.width/2 - bulletRadius, bullet.body.height/2 - bulletRadius);
        let px = player.x, py = player.y;
        let bx = bullet.x, by = bullet.y;
        let dist = Phaser.Math.Distance.Between(px, py, bx, by);
        if (dist < player.displayWidth / 2.2 + bulletRadius) {
          if (!isPlayerDying && !warningActive && sessionActive) {
            triggerPlayerHit(this, player, bullet);
          }
        }
      });
    });

    this.physics.add.overlap(player, this.enemyGroup, (playerObj, enemy) => {
      let obj = enemies.find(e => e.sprite === enemy && e.type === 1 && !e.dead);
      if (!obj) return;
      if (!obj.attackTimer) {
        obj.attackTimer = this.time.addEvent({
          delay: 1000,
          callback: () => {
            enemyAttackSword(obj, this, playerObj);
            obj.attackTimer2 = this.time.addEvent({
              delay: 3000,
              loop: true,
              callback: () => {
                enemyAttackSword(obj, this, playerObj);
              }
            });
          }
        });
      }
    }, null, this);

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        this.physics.world.colliders.getActive().forEach(collider => {
          let allow =
            (
              (collider.object1 === this.bulletsGroup && collider.object2 === this.enemyGroup) ||
              (collider.object1 === this.enemyGroup && collider.object2 === this.bulletsGroup) ||
              (collider.object1 === player && collider.object2 === this.enemyBulletGroup) ||
              (collider.object1 === this.enemyBulletGroup && collider.object2 === player) ||
              (collider.object1 === player && collider.object2 === this.enemyGroup) ||
              (collider.object1 === this.enemyGroup && collider.object2 === player)
            );
          if (!allow) collider.destroy();
        });
      }
    });

    this.events.on('postupdate', () => {
      this.bulletsGroup.children.each(bullet => {
        if (bullet.body) {
          bullet.body.setAllowGravity(false);
          bullet.body.setCollideWorldBounds(false);
          bullet.body.checkCollision.none = false;
        }
      });
      this.enemyBulletGroup.children.each(bullet => {
        if (bullet.body) {
          bullet.body.setAllowGravity(false);
          bullet.body.setCollideWorldBounds(false);
          bullet.body.checkCollision.none = false;
        }
      });
      this.enemyGroup.children.each(enemy => {
        if (enemy.body) {
          enemy.body.setAllowGravity(false);
          enemy.body.setCollideWorldBounds(true);
          enemy.body.checkCollision.none = false;
        }
      });
    });
  }

  update(time, delta) {
    if (player && (player.displayWidth > bgWidth*0.2 || player.displayWidth < 10)) {
      player.setScale(0.11, 0.11);
    }
    this.cameras.main.setZoom(Math.max(gameWidth/bgWidth, gameHeight/bgHeight)*1.35);

    if (player && !isPlayerDying) {
      player.setVisible(true);
      player.body.enable = true;
    }
    let vx = 0, vy = 0;
    if (joyActive && !isPlayerDying) {
      vx = joyDelta.x * 220; vy = joyDelta.y * 220;
    }
    player.setVelocity(vx, vy);

    for (let enemyObj of enemies) {
      let enemy = enemyObj.sprite;
      if (!enemy.active || enemyObj.dead) continue;
      let dx = player.x - enemy.x, dy = player.y - enemy.y;
      let dist = Math.sqrt(dx*dx + dy*dy);

      let evx = 0, evy = 0;
      if (enemyObj.type === 1) {
        let speed = 110;
        enemySpeed1 = speed;
        if (!enemyObj.attacking) {
          if (dist > 35) {
            evx = (dx/dist)*speed; evy = (dy/dist)*speed;
            enemy.setVelocity(evx, evy);
          }
          else enemy.setVelocity(0,0);
        } else {
          enemy.setVelocity(0,0);
        }
      } else if (enemyObj.type === 2) {
        let speed = 110;
        enemySpeed2 = speed;
        let shootRange = 220;
        if (!enemyObj.lastShotTime) enemyObj.lastShotTime = 0;
        if (!enemyObj.hasShot) enemyObj.hasShot = false;
        if (dist > shootRange) {
          evx = (dx/dist)*speed; evy = (dy/dist)*speed;
          enemy.setVelocity(evx, evy);
          enemyObj.hasShot = false;
        } else {
          enemy.setVelocity(0,0);
          if (!enemyObj.hasShot) {
            enemyObj.hasShot = true;
            enemyObj.lastShotTime = time;
            fireEnemyBullet(enemy.x, enemy.y, player.x, player.y, enemy.scene, true);
          }
          if (time - enemyObj.lastShotTime > 3000) {
            enemyObj.lastShotTime = time;
            fireEnemyBullet(enemy.x, enemy.y, player.x, player.y, enemy.scene, true);
          }
        }
      }
    }

    if (sessionActive && !isPlayerDying && time > lastFireTime + 500) {
      let nearest = null, minD = 999999, fireRadius=220;
      for (let enemyObj of enemies) {
        let enemy = enemyObj.sprite;
        if (!enemy.active || enemyObj.dead) continue;
        let dx = player.x - enemy.x, dy = player.y - enemy.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < fireRadius && dist < minD) {minD=dist; nearest=enemy;}
      }
      if (nearest) {
        fireBullet(player.x, player.y, nearest.x, nearest.y, this);
        lastFireTime = time;
        showGunFireAnim(this, player.x + 18, player.y - 8);
      }
    }

    enemyBulletGroup.children.iterate(function(bullet){
      if (bullet && bullet.active) {
        if (
          bullet.x < 0 || bullet.x > bgWidth ||
          bullet.y < 0 || bullet.y > bgHeight
        ) {
          bullet.disableBody(true, true);
        }
      }
    });

    bulletsGroup.children.iterate(function(bullet){
      if (bullet && bullet.active) {
        if (
          bullet.x < 0 || bullet.x > bgWidth ||
          bullet.y < 0 || bullet.y > bgHeight
        ) {
          bullet.disableBody(true, true);
        }
      }
    });
  }
}

function cleanAllGameObjects(scene) {
  try {
    if (scene.enemyGroup) scene.enemyGroup.clear(true, true);
    if (scene.bulletsGroup) scene.bulletsGroup.clear(true, true);
    if (scene.enemyBulletGroup) scene.enemyBulletGroup.clear(true, true);
    if (scene.coinsGroup) scene.coinsGroup.clear(true, true);
  } catch (e) {}
}

function resetGameCamera(scene) {
  try {
    scene.cameras.main.setZoom(1.35);
    scene.cameras.main.setScroll(0, 0);
    scene.cameras.main.roundPixels = true;
  } catch (e) {}
}

function triggerPlayerHit(scene, player, bullet) {
  if (isPlayerDying) return;
  isPlayerDying = true;
  showPlayerHitExplosion(scene, player);
  bullet.disableBody(true, true);
  handlePlayerHit(() => {
    setTimeout(() => {
      isPlayerDying = false;
    }, 1200);
  });
}

function fireBullet(px, py, tx, ty, scene) {
  let gunOffset = {x: 18, y: -8};
  let fromX = px + gunOffset.x;
  let fromY = py + gunOffset.y;
  let bullet = scene.bulletsGroup.create(fromX, fromY, 'kartoucha');
  bullet.setScale(0.0275).setDepth(10); bullet.body.setAllowGravity(false);
  let dx = tx-fromX, dy = ty-fromY, dist = Math.sqrt(dx*dx + dy*dy), speed = 520;
  bullet.setVelocity((dx/dist)*speed, (dy/dist)*speed);
  bullet.rotation = Math.atan2(dy, dx);
  setTimeout(() => { if (bullet && bullet.active) bullet.disableBody(true, true); }, 1200);
}

function fireEnemyBullet(px, py, tx, ty, scene, isEnemy2=false) {
  let gunOffset = {x: 18, y: -8};
  let fromX = px + gunOffset.x;
  let fromY = py + gunOffset.y;
  let bullet = scene.enemyBulletGroup.create(fromX, fromY, 'kartoucha');
  bullet.setScale(0.0275).setDepth(10); bullet.body.setAllowGravity(false);

  let bulletRadius = bullet.displayWidth / 2.2;
  bullet.body.setCircle(bulletRadius, bullet.body.width/2 - bulletRadius, bullet.body.height/2 - bulletRadius);

  let dx = tx-fromX, dy = ty-fromY, dist = Math.sqrt(dx*dx + dy*dy);
  let speed = (isEnemy2 ? enemySpeed2 * 0.5 : enemySpeed2);
  bullet.setVelocity((dx/dist)*speed, (dy/dist)*speed);
  bullet.rotation = Math.atan2(dy, dx);
}

const COIN_VALUE = 0.00000003;

function killEnemy(enemy, scene) {
  if (!sessionActive) return;
  enemy.disableBody(true, true);
  let coin = scene.coinsGroup.create(enemy.x, enemy.y, 'wlc');
  coin.setScale(0.07).setDepth(20);
  animateCoinToBalance(coin);

  sessionBalance += COIN_VALUE;
  setBalance(sessionBalance);
  localStorage.setItem("sessionBalance", sessionBalance);

  let obj = enemies.find(e => e.sprite === enemy);
  if (obj) obj.dead = true;
}

function animateCoinToBalance(coin) {
  let balanceBar = document.getElementById('balance-bar');
  let rect = balanceBar.getBoundingClientRect();
  let gameRect = document.getElementById('game-container').getBoundingClientRect();
  let fx = (rect.left+rect.width/2-gameRect.left)*(coin.scene.cameras.main.worldView.width/gameRect.width)+coin.scene.cameras.main.worldView.x;
  let fy = (rect.top+rect.height/2-gameRect.top)*(coin.scene.cameras.main.worldView.height/gameRect.height)+coin.scene.cameras.main.worldView.y;
  coin.scene.tweens.add({
    targets: coin, x: fx, y: fy, scale: 0.02, alpha: 0.3,
    duration: coinAnimDuration, ease: 'Cubic.easeIn', onComplete: () => { coin.destroy(); }
  });
}

function setupJoystick() {
  const joystickBase = document.getElementById('joystick-base');
  const joystickStick = document.getElementById('joystick-stick');
  let baseX=0, baseY=0, stickX=0, stickY=0;
  function showJoystick(x, y) {
    baseX = x - 55; baseY = y - 55; stickX = x - 28; stickY = y - 28;
    joystickBase.style.left = baseX + 'px'; joystickBase.style.top = baseY + 'px';
    joystickStick.style.left = stickX + 'px'; joystickStick.style.top = stickY + 'px';
    joystickBase.style.display = 'block'; joystickStick.style.display = 'block';
  }
  function hideJoystick() { joystickBase.style.display = 'none'; joystickStick.style.display = 'none'; }
  function moveJoystick(x, y) {
    const dx = x - (baseX + 55), dy = y - (baseY + 55);
    const dist = Math.sqrt(dx*dx + dy*dy); let angle = Math.atan2(dy, dx);
    let maxDist = 44, useDist = Math.min(dist, maxDist);
    let sx = Math.cos(angle) * useDist, sy = Math.sin(angle) * useDist;
    joystickStick.style.left = (baseX + 27 + sx) + 'px'; joystickStick.style.top = (baseY + 27 + sy) + 'px';
    joyDelta.x = sx / maxDist; joyDelta.y = sy / maxDist;
  }
  window.addEventListener('touchstart', function(e) {
    let touch = e.touches[0];
    if (!joyActive && e.touches.length === 1 && touch.clientY > window.innerHeight / 2) {
      joyActive = true; joystickPointerId = touch.identifier;
      joyOrigin.x = touch.clientX; joyOrigin.y = touch.clientY; joyDelta.x = 0; joyDelta.y = 0;
      showJoystick(joyOrigin.x, joyOrigin.y);
    }
  });
  window.addEventListener('touchmove', function(e) {
    if (joyActive) {
      for (let i=0;i<e.touches.length; i++) {
        if (e.touches[i].identifier === joystickPointerId) {
          moveJoystick(e.touches[i].clientX, e.touches[i].clientY); break;
        }
      }
    }
  });
  window.addEventListener('touchend', function(e) {
    if (joyActive) {
      let stillActive = false;
      for (let i=0;i<e.touches.length; i++) {
        if (e.touches[i].identifier === joystickPointerId) {stillActive = true; break;}
      }
      if (!stillActive) {joyActive = false; joyDelta.x = 0; joyDelta.y = 0; hideJoystick();}
    }
  });
}

function showStartBanner() {
  document.getElementById('start-banner').classList.add('active');
}
function hideStartBanner() {
  document.getElementById('start-banner').classList.remove('active');
}
function showCountdown(sec, after) {
  const cd = document.getElementById('start-countdown');
  cd.textContent = sec; cd.style.display = 'block';
  let s = sec;
  let interval = setInterval(() => {
    s--; cd.textContent = (s>0) ? s : "00";
    if (s<=0) {clearInterval(interval); setTimeout(()=>{cd.style.display='none';if(after)after();},700);}
  }, 1000);
}

function randomEdgePosition(cityW, cityH) {
  const edge = Math.floor(Math.random()*4);
  switch(edge) {
    case 0: return { x: Math.random()*cityW, y: 0 };
    case 1: return { x: Math.random()*cityW, y: cityH };
    case 2: return { x: 0, y: Math.random()*cityH };
    case 3: return { x: cityW, y: Math.random()*cityH };
  }
}

function addEnemyWave(scene) {
  let cityW = bgWidth, cityH = bgHeight;
  let n_enemy1 = 6 + (waveCount-1);
  let n_enemy2 = 4 + (waveCount-1);

  let enemy1List = [];
  for(let i=0;i<n_enemy1;i++) {
    let pos = randomEdgePosition(cityW, cityH);
    let enemy = scene.enemyGroup.create(pos.x, pos.y, enemy1Key);
    enemy.setScale(0.10).setDepth(1).body.setCollideWorldBounds(true);
    enemy.attackFrameIndex = 0;
    enemy.attacking = false;
    enemies.push({sprite: enemy, type: 1, attacking: false, attackFrameIndex: 0, dead: false});
    enemy1List.push(enemy);
  }
  function spawnEnemy2Wave() {
    for(let i=0;i<n_enemy2;i++) {
      let pos = randomEdgePosition(cityW, cityH);
      let enemy = scene.enemyGroup.create(pos.x, pos.y, enemy2Key);
      enemy.setScale(0.10).setDepth(1).body.setCollideWorldBounds(true);
      enemies.push({sprite: enemy, type: 2, dead: false});
    }
  }

  setTimeout(spawnEnemy2Wave, 7000);

  waveCount++;
  setTimeout(() => {
    addEnemyWave(scene);
  }, 7000);
}

function startEnemyWaves() {
  const scene = game.scene.scenes[0];
  lastEnemyWaveTime = 0;
  addEnemyWave(scene);
}

function prepareSession() {
  setBalance(sessionBalance);
  waveCount = 1;
  updateHeartsUI();
}

function getUserData() {
  return db.ref("users/" + userId).once("value").then(snap => snap.val() || {});
}
function updateBalance(newVal) {
  db.ref("users/" + userId).once("value").then(snap => {
    let user = snap.val() || {};
    let mainBalance = parseFloat(user.balance || 0);
    let newTotal = (mainBalance + newVal).toFixed(8);
    db.ref("users/" + userId).update({
      balance: newTotal,
      minigame_balance: 0
    });
  });
}

function showGameOver() {
  setTimeout(()=>{
    sessionActive = false;
    document.getElementById('gameover-coins-val').textContent = Number(sessionBalance).toFixed(8);
    document.getElementById('gameover-overlay').style.display = 'flex';
    gameoverFireworks();
  }, 500);
}

// === نقطة التعديل: عند الضغط على claim يتم إرسال العملات للرصيد الرئيسي وتفعيل التبريد والعودة للرئيسية ===
document.getElementById('gameover-claim-btn').onclick = async function() {
  // تحديث الرصيد الرئيسي
  updateBalance(sessionBalance);

  // إعادة تعيين الجلسة
  sessionBalance = 0;
  currentHearts = maxHearts;
  localStorage.setItem("sessionBalance", "0");
  localStorage.setItem("currentHearts", maxHearts);
  localStorage.removeItem("sessionStarted");
  sessionActive = true;
  prepareSession();
  document.getElementById('gameover-overlay').style.display = 'none';

  // تفعيل وقت الانتظار (في فايربيز وليس localStorage)
  let nextTime = Date.now() + GAME_COOLDOWN_MS;
  if (userId) {
    await db.ref("users/" + userId + "/nextPlayTime").set(nextTime);
  }
  // العودة للواجهة الرئيسية
  window.location.href = "index.html";
};

// باقي الكود كما هو...

function gameoverFireworks() {
  let canvas = document.getElementById('gameover-fireworks');
  let ctx = canvas.getContext('2d');
  let w = canvas.width = 300, h = canvas.height = 75;
  let sparks = [];
  for(let i=0;i<25;i++) {
    let angle = Math.random()*2*Math.PI;
    let speed = 2+Math.random()*3;
    sparks.push({
      x: w/2, y: h/2,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed,
      alpha: 1,
      color: `rgba(${220+Math.random()*30},${170+Math.random()*60},0,1)`
    });
  }
  let coins = [];
  for(let i=0;i<8;i++) {
    coins.push({
      x: w/2, y: h/2,
      vx: Math.cos(i/8*2*Math.PI)*2.5 + (Math.random()-0.5)*1.2,
      vy: Math.sin(i/8*2*Math.PI)*2.5 + (Math.random()-0.5)*1.2,
      alpha: 1,
      r: 9 + Math.random()*3
    });
  }
  function draw() {
    ctx.clearRect(0,0,w,h);
    for(let s of sparks) {
      ctx.beginPath();
      ctx.arc(s.x,s.y,2,0,2*Math.PI);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.fill();
      s.x += s.vx;s.y += s.vy;s.alpha -= 0.015;
    }
    for(let c of coins) {
      ctx.beginPath();
      ctx.arc(c.x,c.y,c.r,0,2*Math.PI);
      ctx.fillStyle = "gold";
      ctx.globalAlpha = c.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
      c.x += c.vx;c.y += c.vy;c.alpha -= 0.01;
    }
    sparks = sparks.filter(s=>s.alpha>0.1);
    coins = coins.filter(c=>c.alpha>0.08);
    if(sparks.length+coins.length>0) requestAnimationFrame(draw);
  }
  draw();
}

function enemyAttackSword(enemyObj, scene, playerObj) {
  if (enemyObj.dead) return;
  let enemy = enemyObj.sprite;
  enemyObj.attacking = true;
  enemy.setTexture(enemy1AttackFrames[enemyObj.attackFrameIndex % 2].replace('.png',''));
  enemyObj.attackFrameIndex = (enemyObj.attackFrameIndex + 1) % 2;
  setTimeout(() => {
    if (enemy.active)
      enemy.setTexture(enemy1Key);
    enemyObj.attacking = false;
  }, 350);
  let dx = playerObj.x - enemy.x, dy = playerObj.y - enemy.y, dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < 40 && !warningActive) handlePlayerHit();
}

function handlePlayerHit(cb) {
  if (currentHearts > 0 && !warningActive) {
    warningActive = true;
    currentHearts -= 1;
    localStorage.setItem("currentHearts", currentHearts);
    updateHeartsUI();

    if (currentHearts > 0) {
      localStorage.setItem("sessionBalance", sessionBalance);
      setTimeout(() => {
        if (cb) cb();
        window.location.reload();
      }, 400);
      return;
    }

    showWarningOverlay(cb);
  }
}

function showWarningOverlay(cb) {
  document.getElementById('warning-overlay').style.display = 'flex';
  updateHeartsUI();
  document.getElementById('warning-tryagain-btn').style.display = 'none';
  document.getElementById('warning-title').innerText = '';
  if (currentHearts <= 0) {
    setTimeout(() => {
      document.getElementById('warning-overlay').style.display = 'none';
      warningActive = false;
      showGameOver();
      if (cb) cb();
    }, 800);
  }
}

function checkGameOver() {
  if (currentHearts <= 0) {
    showGameOver();
  }
}

function showGunFireAnim(scene, x, y) {
  let fire = scene.add.sprite(x, y, 'gun_fire').setScale(0.08).setDepth(12);
  fire.alpha = 1;
  scene.tweens.add({
    targets: fire,
    alpha: 0,
    duration: 180,
    onComplete: () => fire.destroy()
  });
}

function showPlayerHitExplosion(scene, playerObj) {
  let fire = scene.add.sprite(playerObj.x, playerObj.y, 'player_hit')
    .setScale(playerObj.displayWidth/64, playerObj.displayHeight/64)
    .setDepth(playerObj.depth + 1);
  fire.alpha = 1;
  scene.tweens.add({
    targets: fire,
    alpha: 0,
    duration: 220,
    onComplete: () => fire.destroy()
  });
}

// =============== واجهة الانتظار عند زر play (في الصفحة الرئيسية) ===============
window.handlePlayButton = async function() {
  // تحقق من التبريد عبر فايربيز وليس localStorage
  if (!userId) return true;
  const nextPlayTime = await getCooldownTimestampFirebase();
  window._nextPlayTime = nextPlayTime;
  if (nextPlayTime > Date.now()) {
    showCooldownOverlay(nextPlayTime - Date.now());
    return false;
  }
  return true;
}

// =============== عند تحميل الصفحة، اربط زر play مع التحقق من التبريد ===============
window.onload = function() {
  if (!userId) return;
  getUserData().then(user => {
    prepareSession();
  });
  showStartBanner();
  document.querySelector("#start-banner .banner-btn").onclick = function() {
    hideStartBanner();
    setTimeout(()=>{
      showCountdown(5, ()=>{
        startEnemyWaves();
      });
    }, 440);
  };
  updateHeartsUI();
  setBalance(sessionBalance);
  document.getElementById('warning-overlay').style.display = 'none';

  let playBtn = document.getElementById("play-btn");
  if (playBtn) {
    playBtn.onclick = async function(e) {
      // تحقق من التبريد عبر فايربيز وليس localStorage
      const allowed = await window.handlePlayButton();
      if (!allowed) e.preventDefault();
    };
  }
};

let game = new Phaser.Game({
  type: Phaser.AUTO,
  width: gameWidth, height: gameHeight,
  backgroundColor: "#101016",
  scene: MainScene,
  physics: { default: 'arcade', arcade: { debug: false } },
  parent: 'game-container',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
});
