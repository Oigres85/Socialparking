/**
 * Genera tutte le immagini di brand a partire da un unico disegno vettoriale:
 *  - public/: favicon SVG, icone PWA (192/512/maskable), apple-touch-icon, og-image
 *  - assets/: sorgenti per `npm run cap:assets` (icone e splash iOS/Android)
 *  - store/graphics/: icona 1024 e feature graphic 1024x500 per Google Play
 * Run: npm run generate-icons
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (...p) => join(root, ...p);
['public', 'assets', 'store/graphics'].forEach(d => mkdirSync(out(d), { recursive: true }));

// "P" disegnata come tracciato: nessuna dipendenza dai font installati
const P_PATH = 'M330,220 H570 C700,220 790,310 790,430 C790,550 700,640 570,640 H460 V820 H330 Z M460,340 H560 C625,340 660,380 660,430 C660,480 625,520 560,520 H460 Z';

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>`;

// Puntino verde = "posto libero"
const dot = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#22c55e" stroke="#ffffff" stroke-width="${r * 0.28}"/>`;

const glyph = (scale = 1) => {
  const t = (1 - scale) * 512;
  const dx = -40 * scale; // centra otticamente la P (il puntino pesa a destra)
  return `<g transform="translate(${t + dx} ${t}) scale(${scale})">
    <path d="${P_PATH}" fill="#ffffff" fill-rule="evenodd"/>
    ${dot(770, 760, 95)}
  </g>`;
};

const iconSvg = ({ rounded = false, bg = true, scale = 1 } = {}) => `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">${defs}
  ${bg ? `<rect width="1024" height="1024" ${rounded ? 'rx="224"' : ''} fill="url(#bg)"/>` : ''}
  ${glyph(scale)}
</svg>`;

const png = (svg, size, file, flatten = false) => {
  let img = sharp(Buffer.from(svg)).resize(size, size);
  if (flatten) img = img.flatten({ background: '#1d4ed8' });
  return img.png().toFile(file);
};

async function main() {
  // Favicon vettoriale
  writeFileSync(out('public/icon-p.svg'), iconSvg({ rounded: true }).trim());

  // PWA
  await png(iconSvg({ rounded: true }), 192, out('public/icon-192.png'));
  await png(iconSvg({ rounded: true }), 512, out('public/icon-512.png'));
  await png(iconSvg({ scale: 0.8 }), 512, out('public/icon-maskable-512.png'), true);
  await png(iconSvg(), 180, out('public/apple-touch-icon.png'), true);

  // Sorgenti Capacitor Assets (iOS vuole icone senza trasparenza e senza angoli arrotondati)
  await png(iconSvg(), 1024, out('assets/icon-only.png'), true);
  await png(iconSvg({ bg: false, scale: 0.62 }), 1024, out('assets/icon-foreground.png'));
  await png(`<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${defs}<rect width="1024" height="1024" fill="url(#bg)"/></svg>`, 1024, out('assets/icon-background.png'));

  const splash = `<svg width="2732" height="2732" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect width="2732" height="2732" fill="#000000"/>
    <g transform="translate(1066 1066) scale(0.586)">
      <rect width="1024" height="1024" rx="224" fill="url(#bg)"/>${glyph(1)}
    </g>
  </svg>`;
  await sharp(Buffer.from(splash)).png().toFile(out('assets/splash.png'));
  await sharp(Buffer.from(splash)).png().toFile(out('assets/splash-dark.png'));

  // Store
  await png(iconSvg(), 1024, out('store/graphics/app-icon-1024.png'), true);
  await png(iconSvg({ rounded: true }), 512, out('store/graphics/play-icon-512.png'));

  const banner = (w, h, title, sub) => `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect width="${w}" height="${h}" fill="#000"/>
    <circle cx="${w * 0.15}" cy="${h * 0.2}" r="${h * 0.9}" fill="#2563eb" opacity="0.25"/>
    <circle cx="${w * 0.95}" cy="${h}" r="${h * 0.7}" fill="#f97316" opacity="0.18"/>
    <g transform="translate(${h * 0.18} ${h * 0.18}) scale(${(h * 0.64) / 1024})">
      <rect width="1024" height="1024" rx="224" fill="url(#bg)"/>${glyph(1)}
    </g>
    <text x="${h * 0.95}" y="${h * 0.47}" font-family="Helvetica, Arial, sans-serif" font-size="${h * 0.15}" font-weight="900" fill="#fff">${title}</text>
    <text x="${h * 0.95}" y="${h * 0.63}" font-family="Helvetica, Arial, sans-serif" font-size="${h * 0.058}" font-weight="700" fill="#9ca3af">${sub}</text>
  </svg>`;
  await sharp(Buffer.from(banner(1024, 500, 'Social Parking', 'Chi parte avvisa chi cerca. Gratis.'))).png().toFile(out('store/graphics/play-feature-graphic-1024x500.png'));
  await sharp(Buffer.from(banner(1200, 630, 'Social Parking', 'Trova parcheggio in tempo reale. Gratis.'))).png().toFile(out('public/og-image.png'));

  console.log('✨ Icone, splash e grafiche store generate.');
}

main().catch(err => {
  console.error('❌ Errore generazione immagini:', err);
  process.exit(1);
});
