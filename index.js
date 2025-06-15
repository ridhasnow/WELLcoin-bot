const { Telegraf } = require("telegraf");
const express = require("express");
const app = express();

// ضع توكن البوت هنا
const bot = new Telegraf("YOUR_TELEGRAM_BOT_TOKEN");

bot.start((ctx) => {
  ctx.reply("أهلاً بك في لعبة WELLcoin 💰! اضغط على الأزرار للبدء.");
});

bot.command("me", (ctx) => {
  ctx.reply("🔍 معلومات حسابك:\nرصيدك: 0.2 WELLcoin\nحالتك: فقير");
});

bot.launch();

app.get("/", (req, res) => {
  res.send("Bot is running...");
});

app.listen(3000, () => {
  console.log("Web server running on port 3000");
});