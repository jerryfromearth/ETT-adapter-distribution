const fs = require("fs");
const cheerio = require("cheerio");
const axios = require("axios");

function extractLinksFromUl(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  const $ = cheerio.load(html);
  const players = [];

  const ul = $("ul").first(); // Only the first <ul>
  ul.find("li").each((_, li) => {
    const $li = $(li);

    // Extract link
    const a = $li.find("a.red").first();
    const href = a.attr("href") || null;

    // Extract name
    const name = a.text().trim();

    // Extract rank
    const rankText = $li.find(".ranking b").first().text().trim();
    const rank = rankText ? parseInt(rankText, 10) : null;

    // Extract Elo
    let elo = null;
    $li.find("span").each((_, span) => {
      const text = $(span).text();
      const match = text.match(/(\d+)\s*Elo/i);
      if (match) {
        elo = parseInt(match[1], 10);
        return false; // break
      }
    });

    players.push({
      name,
      link: "https://11clubhouse.com" + href,
      rank,
      elo,
    });
  });

  return players;
}

async function fetchPaddleAdapter(link) {
  try {
    const res = await axios.get(link);
    const $ = cheerio.load(res.data);
    const dl = $("html > body > main > article > div > div > dl").first();
    let adapter = null;
    dl.find("dt").each((_, dt) => {
      if ($(dt).text().trim() === "Paddle adapter") {
        const dd = $(dt).next("dd");
        adapter = dd
          .text()
          .trim()
          .replace(/^I play with /g, "");
        return false; // break
      }
    });
    return adapter;
  } catch (err) {
    console.error(`Failed to fetch ${link}:`, err.message);
    return null;
  }
}

(async () => {
  const data = extractLinksFromUl("list.html");

  // For each player, fetch and augment paddleAdapter
  for (let i = 0; i < data.length; i++) {
    const player = data[i];
    console.log(
      `Fetching adapter for ${player.name} (${i + 1}/${data.length})...`
    );
    player.paddleAdapter = await fetchPaddleAdapter(player.link);
    console.log(`Fetched: ${player.paddleAdapter || "None"}`);
    // Wait 3 second before next request
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log(JSON.stringify(data, null, 2));
})();
