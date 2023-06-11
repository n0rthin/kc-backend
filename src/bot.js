const TelegramBot = require("node-telegram-bot-api");
const { parseUrl } = require("./parse_url");
const { urlProcessingQueue } = require("./insights");
const { sendInsight } = require("./delivery");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`Created chat with id: ${chatId}`);

  bot.sendMessage(chatId, `Hi, ${msg.chat.first_name}`);
});

bot.onText(/\/send_next_delivery/, (msg) => {
  sendInsight(bot, msg.chat.id);
});

bot.on("message", (msg) => {
  if (["/start", "/send_next_delivery"].includes(msg.text)) return;
  const chatId = msg.chat.id;
  const text = msg.text;

  const url = parseUrl(text);

  if (!url) {
    bot.sendMessage(chatId, "There are no URLs in your message");
    return;
  }

  bot.sendMessage(chatId, `URL ${url} will be added to queue`);
  urlProcessingQueue.addUrl(url);
});

module.exports = {
  bot,
};
