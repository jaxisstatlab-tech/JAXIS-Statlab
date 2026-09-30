// Asks Bing (and other IndexNow search engines) to re-crawl the site's pages. Run after a deploy:
//   node scripts/indexnow.mjs
import { readFileSync } from "node:fs";

const key = /INDEXNOW_KEY = "([0-9a-f]+)"/.exec(readFileSync(new URL("../lib/indexnow.ts", import.meta.url), "utf8"))?.[1];
const host = "jaxis-statlab.com";
const paths = ["", "/pricing", "/about", "/contact", "/privacy", "/terms", "/llms.txt", "/llms-full.txt"];

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: paths.map((p) => `https://${host}${p}`),
  }),
});
console.log(`IndexNow: ${res.status} ${res.statusText}`);
