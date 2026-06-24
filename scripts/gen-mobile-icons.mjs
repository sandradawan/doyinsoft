// Generates the DoyinMart app-icon + splash PNGs from the SVG logo, using sharp.
// Run from the repo root:  node scripts/gen-mobile-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const OUT = "mobile/assets";
mkdirSync(OUT, { recursive: true });

const HANDLE = `<path d="M12 12.6v-1.7a4 4 0 0 1 8 0v1.7" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round"/>`;
const BAG = `<path fill-rule="evenodd" clip-rule="evenodd" d="M8.7 12.4h14.6a1 1 0 0 1 1 1.07l-0.78 10.9a2.4 2.4 0 0 1-2.4 2.23H10.88a2.4 2.4 0 0 1-2.4-2.23l-0.78-10.9a1 1 0 0 1 1-1.07Zm4.5 3.3v8.1h3.06a4.05 4.05 0 0 0 0-8.1H13.2Zm2 1.95v4.2h1.06a2.1 2.1 0 0 0 0-4.2H15.2Z" fill="#ffffff"/>`;

// Full launcher icon: emerald rounded tile + white bag (the D is the emerald show-through).
const iconFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#04553e"/>${HANDLE}${BAG}</svg>`;

// Android adaptive foreground: white bag centered in the 108 safe zone, transparent bg.
const iconFg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
  <g transform="translate(12.4,10.6) scale(2.6)">${HANDLE}${BAG}</g></svg>`;

// Splash mark: just the white bag, transparent (shown centered on the emerald splash).
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${HANDLE}${BAG}</svg>`;

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

await sharp(Buffer.from(iconFull)).resize(1024, 1024).png().toFile(`${OUT}/icon.png`);
await sharp(Buffer.from(iconFg))
  .resize(1024, 1024, { fit: "contain", background: transparent })
  .png()
  .toFile(`${OUT}/icon_fg.png`);
await sharp(Buffer.from(splash))
  .resize(640, 640, { fit: "contain", background: transparent })
  .png()
  .toFile(`${OUT}/splash.png`);

console.log("Wrote icon.png (1024), icon_fg.png (1024), splash.png (640) to", OUT);
