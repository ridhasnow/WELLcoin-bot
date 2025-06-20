
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
bot.start((ctx) => {
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
