const { Insight, Chunk, Article } = require("./db_entities");
const { Op } = require("sequelize");

const INSIGHTS_LENGTH_LIMIT = 400;

async function sendInsight(bot, chatId) {
  console.log(`Sending insights to the ${chatId} chat`);
  // Query the oldest undelivered insight
  console.log(chatId, "searching for undelivered insights");
  const { next } = await iterateInsights();
  let totalLength = 0;
  const groupedInsights = {};

  let insights;
  while ((insights = await next()) !== null) {
    for (const insight of insights) {
      const lengthIfAdded = totalLength + insight.insight.length;
      const url = insight.chunk.article.url;
      if (lengthIfAdded <= INSIGHTS_LENGTH_LIMIT) {
        if (!groupedInsights[url]) groupedInsights[url] = [];
        groupedInsights[url].push(insight);
        totalLength = lengthIfAdded;
        insight.delivered = true;
        await insight.save();
      } else {
        break;
      }
    }
  }

  console.log(
    chatId,
    `found ${
      Object.values(groupedInsights).flat().length
    } insights that are less than ${INSIGHTS_LENGTH_LIMIT} characters. Preparing message`
  );

  const groupedMessages = [];

  for (let url in groupedInsights) {
    const insightText = groupedInsights[url].map(
      (insight) => `*${insight.insight}*`
    );
    const groupedMessage = `${insightText.join("\n\n")}\n\nFrom: ${url}`;
    groupedMessages.push(groupedMessage);
  }

  if (groupedMessages.length) {
    let message = groupedMessages
      .join("\n\n")
      .replace(/\./g, "\\.")
      .replace(/\-/g, "\\-");
    try {
      await bot.sendMessage(chatId, message, { parse_mode: "MarkdownV2" });
      console.log(`Insight has been sent successfully.`);
    } catch (e) {
      console.error(`Failed to send the message: ${e.message}`);
    }
  } else {
    console.log("No undelivered insights found.");
  }
}

async function iterateInsights() {
  const batchSize = 1000;
  let offset = 0;
  const next = async () => {
    const insights = await Insight.findAll({
      offset,
      limit: batchSize,
      where: { delivered: false },
      order: [["created_at", "ASC"]],
      include: [
        {
          model: Chunk,
          include: [
            {
              model: Article,
            },
          ],
        },
      ],
    });

    offset += batchSize;
    return insights.length > 0 ? insights : null;
  };

  return {
    next,
  };
}

module.exports = {
  sendInsight,
};
