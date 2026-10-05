import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = "C:/Users/WeShippX/Desktop/eckamcreation/organized_products";
const IMAGE_EXT = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(ROOT);
const dirs = [];
function walkDirs(dir) {
  dirs.push(dir);
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkDirs(full);
  }
}
walkDirs(ROOT);

const images = files.filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()));
const byCat = {};
const names = {};
const hashes = {};
const titles = [];

for (const file of images) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const cat = rel.split("/")[0];
  byCat[cat] = (byCat[cat] || 0) + 1;
  const base = rel.split("/").pop();
  names[base] = (names[base] || 0) + 1;
  const buf = readFileSync(file);
  const h = createHash("sha1").update(buf).digest("hex");
  hashes[h] = hashes[h] || [];
  hashes[h].push(rel);
  const text = buf.toString("utf8").slice(0, 4000);
  const title = (text.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1];
  const desc = (text.match(/<desc[^>]*>([^<]+)<\/desc>/i) || [])[1];
  if (title || desc) titles.push({ rel, title, desc });
}

const dupNames = Object.entries(names).filter(([, n]) => n > 1);
const dupHash = Object.entries(hashes).filter(([, list]) => list.length > 1);

console.log(
  JSON.stringify(
    {
      folders: dirs.map((d) => relative(ROOT, d).replaceAll("\\", "/") || "."),
      folderCount: dirs.length,
      fileCount: files.length,
      imageCount: images.length,
      byCat,
      exts: [...new Set(images.map((f) => extname(f).toLowerCase()))],
      dupFilenames: dupNames.length,
      dupFilenameSamples: dupNames.slice(0, 15),
      contentDupGroups: dupHash.length,
      contentDupFiles: dupHash.reduce((n, [, list]) => n + list.length, 0),
      titled: titles.slice(0, 40),
      titledCount: titles.length,
      samples: images.slice(0, 20).map((f) => relative(ROOT, f).replaceAll("\\", "/")),
    },
    null,
    2,
  ),
);
