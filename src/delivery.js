const { Insight, Chunk, Article, Delivery, User } = require("./db_entities");
const { Op } = require("sequelize");
const { escapeMarkdown } = require("./markdown");
const { getUserByTgId } = require("./user");

const INSIGHTS_LENGTH_LIMIT = 400;

async function sendInsight(bot, chatId) {
  try {
    const user = await getUserByTgId({ tg_id: chatId });
    if (!user) return;
    console.log(`Sending insights to the ${user.id} chat`);
    // Query the oldest undelivered insight
    console.log(user.id, "searching for undelivered insights");
    const { next } = await iterateInsights(user.id);
    let totalLength = 0;
    const groupedInsights = {};

    let insights;
    while ((insights = await next()) !== null) {
      for (const insight of insights) {
        if (insight.deliveries.length > 0) continue;

        const lengthIfAdded = totalLength + insight.insight.length;
        const url = insight.chunk.article.url;
        if (lengthIfAdded <= INSIGHTS_LENGTH_LIMIT) {
          if (!groupedInsights[url]) groupedInsights[url] = [];
          groupedInsights[url].push(insight);
          totalLength = lengthIfAdded;
        } else {
          break;
        }
      }
    }

    console.log(
      user.id,
      `found ${
        Object.values(groupedInsights).flat().length
      } insights that are less than ${INSIGHTS_LENGTH_LIMIT} characters. Preparing message`
    );

    const groupedMessages = [];

    for (let url in groupedInsights) {
      const insightText = groupedInsights[url].map(
        (insight) => `*${escapeMarkdown(insight.insight)}*`
      );
      const groupedMessage = `${insightText.join(
        "\n\n"
      )}\n\nFrom: ${escapeMarkdown(url)}`;
      groupedMessages.push(groupedMessage);
    }

    if (groupedMessages.length) {
      let message = groupedMessages.join("\n\n");
      try {
        await bot.sendMessage(chatId, message, { parse_mode: "MarkdownV2" });
        await Promise.all(
          Object.values(groupedInsights)
            .flat()
            .map((insight) =>
              Delivery.create({ user_id: user.id, insight_id: insight.id })
            )
        );
        console.log(`Insight has been sent successfully.`);
      } catch (e) {
        console.error(`Failed to send the message: ${e.message}`);
      }
    } else {
      console.log("No undelivered insights found.");
    }
  } catch (err) {
    console.log("failed to send delivery", err);
  }
}

async function iterateInsights(userId) {
  const batchSize = 1000;
  let offset = 0;
  const articles = await Article.findAll({
    include: [
      {
        model: User,
        required: true,
        where: {
          id: userId,
        },
      },
    ],
  });
  const next = async () => {
    const insights = await Insight.findAll({
      offset,
      limit: batchSize,
      order: [["created_at", "ASC"]],
      include: [
        {
          model: Delivery,
          where: {
            user_id: userId,
          },
          required: false,
        },
        {
          model: Chunk,
          required: true,
          include: [
            {
              model: Article,
              required: true,
              where: {
                id: {
                  [Op.in]: articles.map((article) => article.id),
                },
              },
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
