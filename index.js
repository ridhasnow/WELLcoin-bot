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
  }

  // أرسل زر اللعبة
  ctx.reply("👋 You've been registered! Click the button below to play.", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "▶️ Play WELLcoin Game", callback_game: {}, callback_data: "play" }]
      ]
    }
  });
});

// تلقي Callback من زر Play Game
bot.on("callback_query", async (ctx) => {
  const query = ctx.callbackQuery;

  if (query.game_short_name === "WELLcoin_SavemeGame" || query.data === "play") {
    if (typeof ctx.answerCbQuery === 'function') {
      await ctx.answerCbQuery(); // مهم جدًا
    }
    await ctx.telegram.sendGame(query.from.id, "WELLcoin_SavemeGame");
  }
});

// Webhook
app.use(bot.webhookCallback("/telegraf"));

app.listen(10000, async () => {
  const url = "https://wellcoin-bot.onrender.com"; // رابطك على Render
  await bot.telegram.setWebhook(`${url}/telegraf`);
  console.log("✅ Webhook connected to:", `${url}/telegraf`);
});
