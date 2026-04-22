import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const inputSvg = join(publicDir, 'icon-p.svg');

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function generateIcons() {
  try {
    console.log('🚀 Avvio generazione icone...');

    // Generazione icone PWA
    for (const icon of icons) {
      await sharp(inputSvg)
        .resize(icon.size, icon.size)
        .png()
        .toFile(join(publicDir, icon.name));
      console.log(`✅ Generata: ${icon.name}`);
    }

    // Generazione og-image.png (1200x630)
    console.log('🚀 Generazione og-image.png...');
    await sharp({
      create: { 
        width: 1200, 
        height: 630, 
        channels: 4, 
        background: { r: 0, g: 0, b: 0, alpha: 1 } 
      }
    })
    .composite([{
      input: Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="160" height="160" x="520" y="120" rx="32" fill="#2563eb"/>
        <text x="600" y="235" text-anchor="middle" font-size="120" font-weight="900" fill="white" font-family="Arial">P</text>
        <text x="600" y="360" text-anchor="middle" font-size="64" font-weight="900" fill="white" font-family="Arial">Social Parking</text>
        <text x="600" y="440" text-anchor="middle" font-size="32" font-weight="400" fill="#9ca3af" font-family="Arial">Trova parcheggio in tempo reale</text>
      </svg>`),
      top: 0, 
      left: 0
    }])
    .png()
    .toFile(join(publicDir, 'og-image.png'));
    
    console.log('✅ Generata: og-image.png');
    console.log('✨ Tutte le immagini sono state generate con successo!');
  } catch (err) {
    console.error('❌ Errore durante la generazione delle icone:', err);
    process.exit(1);
  }
}

generateIcons();
