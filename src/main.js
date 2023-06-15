require("dotenv").config();
const cron = require("node-cron");
const http = require("http");
const { bot } = require("./bot");
const { sendInsight } = require("./delivery");
const { User } = require("./db_entities");

cron.schedule(
  "0 0 */4 * * *",
  async () => {
    const users = await User.findAll();
    for (const user of users) {
      await sendInsight(bot, user.tg_id);
    }
  },
  {
    timezone: "Europe/Kiev",
  }
);
console.log("Task scheduled");

const server = http.createServer();
server.listen(process.env.PORT);
