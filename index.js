const { Telegraf } = require("telegraf");
const express = require("express");
const app = express();
const path = require("path");

// Telegram bot token
const bot = new Telegraf("7532250033:AAFtD6O80O4rTOeoHHnYKTFDa1yFLpxxrR8");

// === Bot Commands ===
bot.start((ctx) => {
  ctx.reply("🎮 Welcome to the WELLcoin game! Tap the buttons below to start mining.");
});

bot.command("me", (ctx) => {
  ctx.reply("🔍 Your account info:\nBalance: 0.2 WELLcoin\nStatus: Poor");
});

// === Start the bot with polling ===
bot.launch();
console.log("Bot is running...");

// === Serve static frontend files from /public ===
app.use(express.static("public"));

// === Serve index.html on root ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === Start web server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});
