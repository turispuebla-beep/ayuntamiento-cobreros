/**
 * Genera PNG reales para PWA desde images/escudo-cobreros.jpg
 * Ejecutar: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'images', 'escudo-cobreros.jpg');
const bg = { r: 255, g: 255, b: 255, alpha: 1 };

async function out(name, size) {
  const dest = join(root, 'images', name);
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: bg })
    .png()
    .toFile(dest);
  console.log('OK', dest);
}

await out('escudo-cobreros-192.png', 192);
await out('escudo-cobreros-512.png', 512);
await out('escudo-cobreros.png', 256);
