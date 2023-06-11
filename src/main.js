require("dotenv").config();
const cron = require("node-cron");
const http = require("http");
const { bot } = require("./bot");
const { sendInsight } = require("./delivery");

const chatId = process.env.TELEGRAM_CHAT_ID;

cron.schedule(
  "0 0 */4 * * *",
  () => {
    sendInsight(bot, chatId);
  },
  {
    timezone: "Europe/Kiev",
  }
);
console.log("Task scheduled");

const server = http.createServer();
server.listen(process.env.PORT);
