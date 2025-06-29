const { Telegraf } = require("telegraf");
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.static("public"));
app.use(express.json());

const playersFilePath = path.join(__dirname, "players.json");

// تحميل بيانات اللاعبين
let players = {};
if (fs.existsSync(playersFilePath)) {
  try {
    const data = fs.readFileSync(playersFilePath);
    players = JSON.parse(data);
  } catch (err) {
    console.error("❌ Error reading players.json:", err);
  }
}

// نقطة البداية
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

    fs.writeFileSync(playersFilePath, JSON.stringify(players, null, 2));
    ctx.replyWithGame("WELLcoin_SavemeGame");
  } else {
    ctx.reply(`👋 Welcome back, ${username}!`);
  }
});

// تلقي Callback من زر Play Game
bot.on("callback_query", (ctx) => {
  if (ctx.callbackQuery.game_short_name === "WELLcoin_SavemeGame") {
    if (ctx.callbackQuery && typeof ctx.answerCbQuery === 'function') {
  ctx.answerCbQuery();
};
    ctx.replyWithGame("WELLcoin_SavemeGame");
  }
});

// ربط Webhook
app.use(bot.webhookCallback("/telegraf"));

app.listen(10000, async () => {
  const url = "https://wellcoin-bot.onrender.com"; // رابط موقعك
  await bot.telegram.setWebhook(`${url}/telegraf`);
  console.log("✅ Webhook connected to:", `${url}/telegraf`);
});
