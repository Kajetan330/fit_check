import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "share");
const appUrl = "https://fit-check-ecru.vercel.app";

const creators = [
  {
    handle: "amara-okafor",
    name: "Amara Okafor",
    taste: "Warm minimalism with one precise statement.",
    description: "Soft minimalist wardrobes with practical polish and warm-weather tailoring.",
    image: "/assets/media/fitcheck-media-03.jpg",
  },
  {
    handle: "lena-park",
    name: "Lena Park",
    taste: "Modular city layers that earn their space.",
    description: "Sharp city uniforms, modular layers, and capsule systems for small closets.",
    image: "/assets/media/fitcheck-media-08.jpg",
  },
  {
    handle: "noor-hassan",
    name: "Noor Hassan",
    taste: "Elegant coverage, saturated color, camera-ready proportions.",
    description: "Modest occasionwear, elegant proportions, and color stories that photograph beautifully.",
    image: "/assets/media/fitcheck-media-13.jpg",
  },
  {
    handle: "ivy-marlowe",
    name: "Ivy Marlowe",
    taste: "Texture-led vintage with a designer eye.",
    description: "Dark academia, thrifted tailoring, and designer drops for people who love texture.",
    image: "/assets/media/fitcheck-media-14.jpg",
  },
];

const edits = [
  {
    handle: "amara-okafor",
    slug: "copenhagen-2027-edit",
    title: "Copenhagen 2027 Edit",
    description: "Twenty warm-minimal pieces Amara would actually buy now.",
    price: "$19",
    image: "/assets/media/fitcheck-media-03.jpg",
  },
  {
    handle: "lena-park",
    slug: "rainy-city-capsule",
    title: "Rainy City Capsule",
    description: "A compact weatherproof edit for small closets.",
    price: "$15",
    image: "/assets/media/fitcheck-media-09.jpg",
  },
  {
    handle: "noor-hassan",
    slug: "wedding-guest-under-200",
    title: "Wedding Guest Dresses Under $200",
    description: "Modest, camera-ready options with accessory formulas.",
    price: "$17",
    image: "/assets/media/fitcheck-media-11.jpg",
  },
  {
    handle: "ivy-marlowe",
    slug: "vintage-listings-worth-buying",
    title: "Vintage Listings Worth Buying This Week",
    description: "Texture, tailoring, and repairable finds before they disappear.",
    price: "$12",
    image: "/assets/media/fitcheck-media-12.jpg",
  },
];

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });
}

function socialSvg({ title, subtitle, image, price }) {
  const accent = price
    ? `\n  <text x="68" y="560" fill="#d7ff4f" font-size="42" font-weight="800">${escapeHtml(price)}</text>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#151515"/>
  <image href="${escapeHtml(image)}" x="690" y="0" width="510" height="630" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="760" height="630" fill="#151515"/>
  <text x="68" y="86" fill="#d7ff4f" font-size="30" font-weight="800">FitCheck</text>
  <text x="68" y="210" fill="#ffffff" font-size="66" font-weight="900">${escapeHtml(title)}</text>
  <foreignObject x="68" y="250" width="560" height="210">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:#d8d8d2;font-size:34px;line-height:1.22;font-weight:600">${escapeHtml(subtitle)}</div>
  </foreignObject>${accent}
</svg>`;
}

function page({ title, description, canonicalPath, imagePath }) {
  const canonical = `${appUrl}${canonicalPath}`;
  const image = `${appUrl}${imagePath}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0; url=${canonicalPath}" />
  </head>
  <body>
    <p><a href="${canonicalPath}">Open ${escapeHtml(title)} on FitCheck</a></p>
  </body>
</html>`;
}

mkdirSync(outDir, { recursive: true });

for (const creator of creators) {
  const imageName = `og-creator-${creator.handle}.svg`;
  writeFileSync(
    join(outDir, imageName),
    socialSvg({ title: creator.name, subtitle: creator.taste, image: creator.image }),
  );
  writeFileSync(
    join(outDir, `creator-${creator.handle}.html`),
    page({
      title: `${creator.name} on FitCheck`,
      description: creator.description,
      canonicalPath: `/creator/${creator.handle}`,
      imagePath: `/share/${imageName}`,
    }),
  );
}

for (const edit of edits) {
  const imageName = `og-edit-${edit.handle}-${edit.slug}.svg`;
  writeFileSync(
    join(outDir, imageName),
    socialSvg({ title: edit.title, subtitle: edit.description, image: edit.image, price: edit.price }),
  );
  writeFileSync(
    join(outDir, `edit-${edit.handle}-${edit.slug}.html`),
    page({
      title: `${edit.title} on FitCheck`,
      description: edit.description,
      canonicalPath: `/creator/${edit.handle}/edit/${edit.slug}`,
      imagePath: `/share/${imageName}`,
    }),
  );
}

console.log(`Generated ${creators.length + edits.length} share pages in public/share`);
