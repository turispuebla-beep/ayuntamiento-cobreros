/**
 * Genera js/firebase-config.generated.js sin commitear API keys.
 * Netlify: variables en Site settings → Environment variables.
 * Local: copia .env.firebase.example → .env.firebase (no subir a git).
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

const fileEnv = loadEnvFile(path.join(rootDir, '.env.firebase'));
const env = { ...fileEnv, ...process.env };

const config = {
  apiKey: env.FIREBASE_API_KEY || '',
  authDomain: env.FIREBASE_AUTH_DOMAIN || 'ayuntamiento-de-cobreros.firebaseapp.com',
  projectId: env.FIREBASE_PROJECT_ID || 'ayuntamiento-de-cobreros',
  storageBucket:
    env.FIREBASE_STORAGE_BUCKET || 'ayuntamiento-de-cobreros.firebasestorage.app',
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '527550932354',
  appId: env.FIREBASE_APP_ID || '1:527550932354:web:9bd8431defa7c293b1db9b'
};

if (!config.apiKey) {
  console.error(
    'Falta FIREBASE_API_KEY. En Netlify: Site settings → Environment variables. Local: .env.firebase'
  );
  process.exit(1);
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
