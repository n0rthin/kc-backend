const { Configuration, OpenAIApi } = require("openai");
const { scrapArticleContent } = require("./scrap");
const { splitText } = require("./text");
const { Article, Chunk, Insight } = require("./db_entities");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

async function getKeyInsights({ url, maxTokens = 2048, useSmartModel = true }) {
  console.log(
    `Obtaining key insights for ${url}, maxTokens=${maxTokens}, useSmartModel=${useSmartModel}`
  );
  console.log(`Scrapping URL...`);
  const articleText = await scrapArticleContent(url);
  console.log(`URL scrapped. Splitting into chunks...`);
  const chunks = splitText(articleText, maxTokens);
  console.log(`Split content into ${chunks.length} chunks`);
  const keyInsights = {};

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const prompt = `This is a part of the article:\n\n${chunk}\n\nProvide valuable insights from this article.\nYour response should be a valid json array where each item is a string containing one insight.\nIf you don't see any valuable insights in the article just respond with empty array.\nDo not include anything else besides json array with insights.\nMake sure that your response can be parsed by json.loads in python without errors. JSON:`;
    const model = useSmartModel ? "gpt-4" : "gpt-3.5-turbo";
    const messages = [{ role: "user", content: prompt }];
    let response;
    console.log(
      `Chunk #${i + 1}. Asking GPT for insights. Prompt: ${prompt
        .replace()
        .replace(/\n/g, "\\n")}`
    );
    while (true) {
      try {
        response = await openai.createChatCompletion({
          model,
          temperature: 0,
          max_tokens: 1000,
          messages,
        });
        break;
      } catch (err) {
        const errorForLogs = err.response
          ? `${err.response.status} + ${
              err.response.statusText
            } + ${JSON.stringify(err.response.data)}`
          : err;
        console.log(
          `Chunk #${i + 1}. OpenAI API request has failed`,
          errorForLogs
        );
        if (err.response?.status === 400 || err.status === 400) {
          throw err;
        } else {
          console.log(`Chunk #${i + 1}. Retrying in 5 seconds`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }
    try {
      console.log(`Chunk #${i + 1}. Parsing GPT response...`);
      const insights = JSON.parse(
        response.data.choices[0].message.content.trim()
      );
      keyInsights[chunk] = insights;
    } catch (err) {
      console.log(`Chunk #${i + 1}. Failed to parse ${model} response`, err);
    }
  }

  return keyInsights;
}

async function generateAndStoreKeyInsights(url) {
  const keyPoints = await getKeyInsights({ url, useSmartModel: true });
  const article = await Article.create({ url });

  for (const chunk in keyPoints) {
    const chunkInstance = await Chunk.create({
      content: chunk,
      article_id: article.id,
    });
    for (const insight of keyPoints[chunk]) {
      await Insight.create({ insight, chunk_id: chunkInstance.id });
    }
  }

  console.log(`Key points for the url ${url} have been saved successfully.`);
}

function getURLProcessingQueue() {
  const queue = [];
  let proccessingInProgress = false;

  async function processQueue() {
    proccessingInProgress = true;
    let url;
    while ((url = queue.shift())) {
      try {
        await generateAndStoreKeyInsights(url);
      } catch (err) {
        console.log(`Failed to process ${url}`, err);
      }
    }
    proccessingInProgress = false;
  }

  return {
    addUrl(url) {
      queue.push(url);
      console.log(
        `Added ${url} to queue. ${queue.length} items in queue currently`
      );

      if (!proccessingInProgress) {
        processQueue();
      }
    },
  };
}

const urlProcessingQueue = getURLProcessingQueue();

module.exports = {
  urlProcessingQueue,
};
