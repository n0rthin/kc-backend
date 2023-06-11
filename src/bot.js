const TelegramBot = require("node-telegram-bot-api");
const { parseUrl } = require("./parse_url");
const { generateAndStoreKeyInsights } = require("./insights");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`Created chat with id: ${chatId}`);

  bot.sendMessage(chatId, `Hi, ${msg.chat.first_name}`);
});

bot.on("message", (msg) => {
  if (msg.text === "/start") return;
  const chatId = msg.chat.id;
  const text = msg.text;

  const url = parseUrl(text);

  if (!url) {
    bot.sendMessage(chatId, "There are no URLs in your message");
    return;
  }

  bot.sendMessage(chatId, `URL ${url} will be added to queue`);
  generateAndStoreKeyInsights(url).catch((err) => {
    console.log(`Error while adding URL to queue`, err);
  });
});

module.exports = {
  bot,
};
