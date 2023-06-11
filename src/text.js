const { default: GPT3Tokenizer } = require("gpt3-tokenizer");

const tokenizer = new GPT3Tokenizer({ type: "gpt3" }); // or 'codex'

function splitText(text, maxTokens) {
  // Tokenize the text
  const words = tokenizer.encode(text).text;

  // Check if text is less than the maxTokens
  if (words.length <= maxTokens) {
    return [text];
  } else {
    // If not, split the text
    const chunks = [];
    let chunk = [];
    let tokenCount = 0;

    for (let word of words) {
      if (tokenCount + word.split(" ").length <= maxTokens) {
        chunk.push(word);
        tokenCount += word.split(" ").length;
      } else {
        chunks.push(chunk.join(" "));
        chunk = [word];
        tokenCount = word.split(" ").length;
      }
    }

    chunks.push(chunk.join(" "));

    return chunks;
  }
}

module.exports = { splitText };
