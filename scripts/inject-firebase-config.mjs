/**
 * Genera js/firebase-config.generated.js
 * Prioridad: env / .env.firebase → firebase.web.public.json (local) → firebase.web.build.json (Netlify/CI)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const targetDir = path.resolve(targetDirArg());

function targetDirArg() {
  const arg = process.argv[2];
  if (arg) {
    const cleaned = String(arg).trim().replace(/^["']|["']$/g, '').replace(/[\\/]+$/g, '');
    return path.isAbsolute(cleaned) ? cleaned : path.resolve(process.cwd(), cleaned);
  }
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

function loadJsonConfig(filePath, label) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (parsed.apiKey) {
      console.log(`ℹ️ ${label}:`, filePath);
      return parsed;
    }
  } catch (error) {
    console.warn('No se pudo leer', filePath, error.message);
  }
  return null;
}

function loadPublicConfig() {
  const candidates = [
    { path: path.join(targetDir, 'config', 'firebase.web.public.json'), label: 'Config local' },
    { path: path.join(rootDir, 'config', 'firebase.web.public.json'), label: 'Config local' },
    { path: path.join(targetDir, 'config', 'firebase.web.build.json'), label: 'Config build (Netlify/CI)' },
    { path: path.join(rootDir, 'config', 'firebase.web.build.json'), label: 'Config build (Netlify/CI)' }
  ];
  for (const { path: filePath, label } of candidates) {
    const parsed = loadJsonConfig(filePath, label);
    if (parsed) return parsed;
  }
  return {};
}

const publicConfig = loadPublicConfig();
const fileEnv = loadEnvFile(path.join(rootDir, '.env.firebase'));
const fileEnvParent = loadEnvFile(path.join(rootDir, '..', '.env.firebase'));
const fileEnvCwd = loadEnvFile(path.join(process.cwd(), '.env.firebase'));
const env = { ...publicConfig, ...fileEnvParent, ...fileEnv, ...fileEnvCwd, ...process.env };

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
      '  1) Netlify → Environment variables → FIREBASE_API_KEY\n' +
      '  2) Local: .env.firebase\n' +
      '  3) config/firebase.web.build.json (incluido para deploy)\n' +
      '  4) setup-env-firebase.bat'
  );
  process.exit(1);
}

if (!env.FIREBASE_API_KEY && !fileEnv.FIREBASE_API_KEY && !fileEnvParent.FIREBASE_API_KEY && !fileEnvCwd.FIREBASE_API_KEY) {
  console.warn('⚠️ Usando apiKey de config JSON (build o local).');
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
