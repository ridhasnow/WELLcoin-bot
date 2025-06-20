
const { Telegraf } = require("telegraf");
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const bot = new Telegraf("7532250033:AAFtD6O80O4rTOeoHHnYKTFDa1yFLpxxrR8");

// Serve static files from public folder
app.use(express.static("public"));

// Web route to serve HTML UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Express server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Web server running on port " + PORT);
});

// Handle /start and send Web App button
const fs = require('fs');

// تحميل بيانات اللاعبين من ملف JSON
let players = {};
const dataFile = 'players.json';

// إذا الملف موجود، نقرأه
if (fs.existsSync(dataFile)) {
  players = JSON.parse(fs.readFileSync(dataFile));
}

// عند دخول مستخدم جديد أو قديم
bot.start((ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;

  // إذا اللاعب جديد
  if (!players[userId]) {
    players[userId] = {
      id: userId,
      username: username,
      coins: 0,
      miningSpeed: 0.2,
      lastMineTime: Date.now()
    };
    fs.writeFileSync(dataFile, JSON.stringify(players, null, 2));
    ctx.reply(`Welcome ${username}!\nYour game account has been created 🎮`);
  } else {
    ctx.reply(`Welcome back ${username}!\nYour progress has been loaded 🔁`);
  }
});

  ctx.reply("Welcome to WELLcoin Game!", {
    reply_markup: {
      keyboard: [
        [
          {
            text: "▶️ Play WELLcoin",
            web_app: { url: "https://wellcoin-bot.onrender.com" },
          },
        ],
      ],
      resize_keyboard: true,
    },
  });
});

bot.launch();
