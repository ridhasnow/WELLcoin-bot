const { Telegraf } = require("telegraf");
const express = require("express");

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.static("public"));
app.use(express.json());

// أمر start - يرسل زر Play Now فقط
bot.start((ctx) => {
  ctx.reply("Click the button below to play:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "▶️ Play Now", web_app: { url: "https://wellcoin-bot.onrender.com/welcome.html" } }]
      ]
    }
  });
});

// ربط Webhook
app.use(bot.webhookCallback("/telegraf"));

app.listen(10000, async () => {
  const url = "https://wellcoin-bot.onrender.com"; // رابطك
  await bot.telegram.setWebhook(`${url}/telegraf`);
  console.log("✅ Webhook connected to:", `${url}/telegraf`);
});
