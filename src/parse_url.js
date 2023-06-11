function parseUrl(text) {
  const urlPattern = new RegExp(
    "http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+",
    "g"
  );

  const urls = text.match(urlPattern);
  return urls && urls.length > 0 ? urls[0] : "";
}

module.exports = { parseUrl };
