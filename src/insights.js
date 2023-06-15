const { Configuration, OpenAIApi } = require("openai");
const { scrapArticleContent } = require("./scrap");
const { splitText } = require("./text");
const { Article, Chunk, Insight } = require("./db_entities");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

async function getKeyInsights({
  url,
  articleId,
  maxTokens = 2048,
  useSmartModel = true,
}) {
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
    const logPrefix = `Chunk ${i + 1}/${chunks.length}.`;

    const chunkInstance = await Chunk.create({
      content: chunk,
      article_id: articleId,
    });

    const prompt = `This is a part of the article:\n\n${chunk}\n\nProvide valuable insights from this article.\nYour response should be a valid json array where each item is a string containing one insight.\nIf you don't see any valuable insights in the article just respond with empty array.\nDo not include anything else besides json array with insights.\nMake sure that your response can be parsed by json.loads in python without errors. JSON:`;
    const model = useSmartModel ? "gpt-4" : "gpt-3.5-turbo";
    const messages = [{ role: "user", content: prompt }];
    let response;
    console.log(
      `${logPrefix} Asking GPT for insights. Prompt: ${prompt
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
        console.log(`${logPrefix} OpenAI API request has failed`, errorForLogs);
        if (err.response?.status === 400 || err.status === 400) {
          throw err;
        } else {
          console.log(`${logPrefix} Retrying in 5 seconds`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    let insights;
    try {
      console.log(`${logPrefix} Parsing GPT response...`);
      insights = JSON.parse(response.data.choices[0].message.content.trim());
    } catch (err) {
      console.log(`${logPrefix} Failed to parse ${model} response`, err);
    }

    if (insights) {
      for (const insight of insights) {
        await Insight.create({ insight, chunk_id: chunkInstance.id });
      }
    }
  }

  return keyInsights;
}

async function generateAndStoreKeyInsights({ url, userId }) {
  const existingArticle = await Article.findOne({ where: { url } });
  if (existingArticle) {
    console.log(`Article for the url ${url} already exists.`);
    await existingArticle.addUser(userId);
    return;
  }
  const article = await Article.create({ url, user_id: userId });
  article.addUser(userId);
  await getKeyInsights({
    url,
    articleId: article.id,
    useSmartModel: true,
  });

  console.log(`Key points for the url ${url} have been saved successfully.`);
}

function getURLProcessingQueue() {
  const queue = [];
  let proccessingInProgress = false;

  async function processQueue() {
    proccessingInProgress = true;
    let urlData;
    while ((urlData = queue.shift())) {
      try {
        await generateAndStoreKeyInsights(urlData);
      } catch (err) {
        console.log(
          `Failed to process ${urlData.url}, userId: ${urlData.userId}`,
          err
        );
      }
    }
    proccessingInProgress = false;
  }

  return {
    addUrl(urlData) {
      queue.push(urlData);
      console.log(
        `Added ${urlData.url} for user ${urlData.userId} to queue. ${queue.length} items in queue currently`
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
