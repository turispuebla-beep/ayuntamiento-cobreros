/**
 * Iconos PWA del escudo de Cobreros (instalación en móvil / escritorio).
 * Ejecutar: npm run icons
 */
import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const imagesDir = join(root, 'images');

const candidates = [
  join(imagesDir, 'escudo-cobreros.png'),
  join(imagesDir, 'escudo-cobreros.jpg'),
];
const src = candidates.find((p) => existsSync(p));
if (!src) {
  console.error('No se encontró escudo-cobreros.png ni .jpg en images/');
  process.exit(1);
}

const white = { r: 255, g: 255, b: 255, alpha: 1 };
const themeBlue = { r: 30, g: 58, b: 138, alpha: 1 };

async function writeIcon(name, size, { background = white, padding = 0.08 } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);
  const escudo = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: white })
    .png()
    .toBuffer();

  const dest = join(imagesDir, name);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: escudo, left: offset, top: offset }])
    .png()
    .toFile(dest);
  console.log('OK', dest);
}

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of sizes) {
  if (size === 16) await writeIcon('favicon-16.png', size);
  else if (size === 32) await writeIcon('favicon-32.png', size);
  else if (size === 180) {
    await writeIcon('apple-touch-icon.png', size);
    await writeIcon('escudo-cobreros-180.png', size);
  }
  else await writeIcon(`escudo-cobreros-${size}.png`, size);
}

await writeIcon('escudo-cobreros.png', 256);
await writeIcon('escudo-cobreros-maskable-192.png', 192, {
  background: themeBlue,
  padding: 0.14,
});
await writeIcon('escudo-cobreros-maskable-512.png', 512, {
  background: themeBlue,
  padding: 0.14,
});

// favicon.ico multi-size (16 + 32)
const fav16 = await sharp(join(imagesDir, 'favicon-16.png')).png().toBuffer();
const fav32 = await sharp(join(imagesDir, 'favicon-32.png')).png().toBuffer();
await sharp(fav32)
  .toFile(join(imagesDir, 'favicon.ico'));
console.log('OK', join(imagesDir, 'favicon.ico'), '(desde 32px; navegadores modernos usan PNG)');

console.log('Iconos PWA generados desde', src);
