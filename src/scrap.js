const axios = require("axios");
const cheerio = require("cheerio");

async function scrapArticleContent(url) {
  // Send a GET request
  let response = await axios.get(url);

  // If the GET request is successful, the status code will be 200
  if (response.status === 200) {
    // Get the content of the response
    let pageContent = response.data;

    // Create a Cheerio object and specify the parser
    let $ = cheerio.load(pageContent);

    // Remove script and style elements
    $("script, style").remove();

    // Get the text from the Cheerio object
    let text = $.text();

    // Split the lines
    let lines = text.split("\n").map((line) => line.trim());

    // Break multi-headlines into a line each
    let chunks = [];
    lines.forEach((line) => {
      line.split("  ").forEach((phrase) => {
        chunks.push(phrase.trim());
      });
    });

    // Remove blank lines
    text = chunks.filter((chunk) => chunk).join("\n");

    return text;
  } else {
    return null;
  }
}

module.exports = { scrapArticleContent };
