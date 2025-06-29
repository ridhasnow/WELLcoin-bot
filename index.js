const { Telegraf } = require("telegraf");
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// خدمة صفحة HTML للعبة
app.use(express.static("public"));

const playersFilePath = path.join(__dirname, "players.json");

// تحميل بيانات اللاعبين من ملف JSON
let players = {};
if (fs.existsSync(playersFilePath)) {
  try {
    const data = fs.readFileSync(playersFilePath);
    players = JSON.parse(data);
  } catch (err) {
    console.error("❌ Error reading players.json:", err);
  }
}

// عند تنفيذ /start من طرف اللاعب
bot.start((ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || "Unknown";

  if (!players[userId]) {
    players[userId] = {
      username,
      wellcoins: 0,
      miningSpeed: 0.2,
      joinedAt: new Date().toISOString(),
    };

    // حفظ بيانات اللاعب
    fs.writeFileSync(playersFilePath, JSON.stringify(players, null, 2));
    ctx.reply(`👋 Welcome, ${username}! You've been registered.`);
  } else {
    ctx.reply(`👋 Welcome back, ${username}!`);
  }

  // إرسال زر "Play" الرسمي المرتبط باللعبة
  ctx.replyWithGame("WELLcoin_SavemeGame"); // <-- استبدلها بالـ short name تبع لعبتك من BotFather
});

// إطلاق البوت والسيرفر
bot.launch();
app.listen(10000, () => {
  console.log("✅ Web server running on port 10000");
});
console.log("✅ Bot is running...");
