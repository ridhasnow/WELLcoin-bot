const { Telegraf } = require("telegraf");
const express = require("express");
const app = express();
const path = require("path");

// Telegram bot token
const bot = new Telegraf("7532250033:AAFtD6O80O4rTOeoHHnYKTFDa1yFLpxxrR8");

// Middleware to handle Telegram Webhook
app.use(bot.webhookCallback("/"));

// Start command
bot.start((ctx) => {
  ctx.reply("🎮 Welcome to the WELLcoin game! Tap the buttons below to start mining.");
});

// Me command
bot.command("me", (ctx) => {
  ctx.reply("🔍 Your account info:\nBalance: 0.2 WELLcoin\nStatus: Poor");
});

// Serve static frontend files from /public
app.use(express.static("public"));

// Serve index.html from root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// Launch bot using Webhook (for Render)
bot.launch({
  webhook: {
    domain: "https://wellcoin-bot.onrender.com",
    port: PORT,
  },
});
