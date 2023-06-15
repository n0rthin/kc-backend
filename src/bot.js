const TelegramBot = require("node-telegram-bot-api");
const { parseUrl } = require("./parse_url");
const { urlProcessingQueue } = require("./insights");
const { sendInsight } = require("./delivery");
const { createUser, getUserByTgId } = require("./user");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`Created chat with id: ${chatId}`);

  bot.sendMessage(chatId, `Hi, ${msg.chat.first_name}`);

  await createUser({ tg_id: chatId });
});

bot.onText(/\/send_next_delivery/, (msg) => {
  sendInsight(bot, msg.chat.id);
});

bot.on("message", async (msg) => {
  if (["/start", "/send_next_delivery"].includes(msg.text)) return;
  const chatId = msg.chat.id;
  const text = msg.text;

  const url = parseUrl(text);

  if (!url) {
    bot.sendMessage(chatId, "There are no URLs in your message");
    return;
  }

  bot.sendMessage(
    chatId,
    `URL ${url} has been added to the queue and will be processed soon`
  );
  const user = await getUserByTgId({ tg_id: chatId });

  urlProcessingQueue.addUrl({
    url,
    userId: user.id,
  });
});

module.exports = {
  bot,
};
