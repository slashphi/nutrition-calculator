import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const html = await readFile(resolve(root, "dist/index.html"), "utf8");
const assetPaths = Array.from(
  html.matchAll(/(?:src|href)="(\/nutrition-calculator\/assets\/[^"]+)"/g),
  (match) => match[1],
);

if (assetPaths.length === 0) {
  throw new Error(
    "Production HTML does not contain repository-base asset paths.",
  );
}

await Promise.all(
  assetPaths.map((assetPath) =>
    access(
      resolve(root, "dist", assetPath.replace("/nutrition-calculator/", "")),
    ),
  ),
);

console.log(
  `Verified ${assetPaths.length} production assets under /nutrition-calculator/.`,
);
