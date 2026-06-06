/**
 * Genera js/firebase-config.generated.js
 * Prioridad: variables de entorno / .env.firebase → config/firebase.web.public.json (local, gitignored)
 * Netlify: FIREBASE_API_KEY obligatoria en Environment variables (no commitear la clave).
 * Local: .env.firebase o copia config/firebase.web.public.example.json → firebase.web.public.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const targetDir = path.resolve(targetDirArg());

function targetDirArg() {
  const arg = process.argv[2];
  if (arg) return path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  return process.cwd();
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function loadPublicConfig() {
  const candidates = [
    path.join(targetDir, 'config', 'firebase.web.public.json'),
    path.join(rootDir, 'config', 'firebase.web.public.json'),
    path.join(rootDir, '..', 'config', 'firebase.web.public.json')
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log('ℹ️ Config Firebase pública:', filePath);
      return parsed;
    } catch (error) {
      console.warn('No se pudo leer', filePath, error.message);
    }
  }
  return {};
}

const publicConfig = loadPublicConfig();
const fileEnv = loadEnvFile(path.join(rootDir, '.env.firebase'));
const fileEnvParent = loadEnvFile(path.join(rootDir, '..', '.env.firebase'));
const env = { ...publicConfig, ...fileEnvParent, ...fileEnv, ...process.env };

const config = {
  apiKey: env.FIREBASE_API_KEY || env.apiKey || '',
  authDomain: env.FIREBASE_AUTH_DOMAIN || env.authDomain || 'ayuntamiento-de-cobreros.firebaseapp.com',
  projectId: env.FIREBASE_PROJECT_ID || env.projectId || 'ayuntamiento-de-cobreros',
  storageBucket:
    env.FIREBASE_STORAGE_BUCKET ||
    env.storageBucket ||
    'ayuntamiento-de-cobreros.firebasestorage.app',
  messagingSenderId:
    env.FIREBASE_MESSAGING_SENDER_ID || env.messagingSenderId || '527550932354',
  appId: env.FIREBASE_APP_ID || env.appId || '1:527550932354:web:9bd8431defa7c293b1db9b'
};

if (!config.apiKey) {
  console.error(
    'Falta FIREBASE_API_KEY. Opciones:\n' +
      '  1) Netlify → Site settings → Environment variables → FIREBASE_API_KEY\n' +
      '  2) Local: .env.firebase con FIREBASE_API_KEY\n' +
      '  3) Local: config/firebase.web.public.json (gitignored; ver firebase.web.public.example.json)'
  );
  process.exit(1);
}

if (!env.FIREBASE_API_KEY && !fileEnv.FIREBASE_API_KEY && !fileEnvParent.FIREBASE_API_KEY) {
  console.warn('⚠️ Usando apiKey de config/firebase.web.public.json local (no commitear ese archivo).');
}

const jsDir = path.join(targetDir, 'js');
fs.mkdirSync(jsDir, { recursive: true });

const body = `// Generado por scripts/inject-firebase-config.mjs — no editar ni commitear
(function (root) {
  var cfg = ${JSON.stringify(config, null, 2)};
  root.__FIREBASE_CONFIG__ = cfg;
  root.FIREBASE_CONFIG = cfg;
})(typeof self !== 'undefined' ? self : window);
`;

const outFile = path.join(jsDir, 'firebase-config.generated.js');
fs.writeFileSync(outFile, body, 'utf8');
console.log('OK:', outFile);
