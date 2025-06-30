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

// أمر start - يرسل زر Play Now فقط
// أمر start - يرسل زر Play Now فقط
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

  // ✅ زر فتح اللعبة
  ctx.reply("Click the button below to play:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "▶️ Play Now", web_app: { url: "https://wellcoin-bot.onrender.com/welcome.html" } }]
      ]
    }
  });
});

// ❌ حذفنا الـ callback_query لأنه ماعاد نحتاجه مع Web App فقط

// ربط Webhook
app.use(bot.webhookCallback("/telegraf"));

app.listen(10000, async () => {
  const url = "https://wellcoin-bot.onrender.com"; // رابطك
  await bot.telegram.setWebhook(`${url}/telegraf`);
  console.log("✅ Webhook connected to:", `${url}/telegraf`);
});
