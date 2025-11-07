#!/usr/bin/env node

/**
 * Restaura un snapshot previamente creado con `npm run snapshot`.
 * Uso: npm run snapshot:restore -- <timestamp>
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');
const fse = require('fs-extra');

const projectRoot = path.resolve(__dirname, '..');
const snapshotsRoot = path.join(projectRoot, 'snapshots');
const args = process.argv.slice(2);

const itemsToRestore = [
  'index.html',
  'css',
  'js',
  'manifest.json',
  'netlify.toml',
  'sw.js',
  'functions/src',
  'functions/lib',
  'firebase-functions',
  'package.json',
  'package-lock.json'
];

function log(message) {
  // eslint-disable-next-line no-console
  console.log(`[restore] ${message}`);
}

function showError(message) {
  log(`❌ ${message}`);
  process.exit(1);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function getGitStatus() {
  try {
    return execSync('git status --porcelain', {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
  } catch (_) {
    return null;
  }
}

async function ensureBackupBeforeRestore() {
  const gitStatus = getGitStatus();
  if (!gitStatus) {
    log('⚠️  No se pudo comprobar el estado de Git. Se continuará sin aviso.');
    return true;
  }

  if (gitStatus.length === 0) {
    return true; // Working tree limpia
  }

  log('⚠️  Hay cambios sin commitear en el repositorio:');
  log(gitStatus.split('\n').map((line) => `   ${line}`).join('\n'));

  const answer = await prompt('¿Deseas continuar y sobrescribir los archivos? (sí/no): ');
  if (answer !== 'sí' && answer !== 'si' && answer !== 's') {
    log('Restauración cancelada por el usuario.');
    return false;
  }

  return true;
}

async function copyItemFromSnapshot(snapshotDir, item) {
  const sourcePath = path.join(snapshotDir, item);
  const destinationPath = path.join(projectRoot, item);

  const exists = await fse.pathExists(sourcePath);
  if (!exists) {
    log(`⚠️  Elemento no encontrado en el snapshot, se omite: ${item}`);
    return;
  }

  await fse.remove(destinationPath).catch(() => null);
  await fse.copy(sourcePath, destinationPath, {
    overwrite: true,
    errorOnExist: false
  });
  log(`✅ Restaurado: ${item}`);
}

async function main() {
  if (args.length === 0) {
    showError('Debes indicar el identificador del snapshot. Ejemplo: npm run snapshot:restore -- 2025-01-10_12-34-56-789');
  }

  const snapshotId = args[0];
  const snapshotDir = path.join(snapshotsRoot, snapshotId);

  if (!fs.existsSync(snapshotDir)) {
    showError(`Snapshot no encontrado en ${snapshotDir}`);
  }

  const confirmed = await ensureBackupBeforeRestore();
  if (!confirmed) {
    process.exit(0);
  }

  log(`Restaurando snapshot desde: ${snapshotDir}`);

  for (const item of itemsToRestore) {
    // eslint-disable-next-line no-await-in-loop
    await copyItemFromSnapshot(snapshotDir, item);
  }

  const metadataPath = path.join(snapshotDir, 'snapshot-info.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = await fse.readJson(metadataPath);
    log('ℹ️  Información del snapshot restaurado:');
    log(`   Creado en: ${metadata.createdAt}`);
    log(`   Git status original:\n${metadata.gitStatus}`);
  }

  log('✨ Restauración completada.');
  log('Recuerda ejecutar `npm install` si restauraste package.json y package-lock.json.');
  log('Verifica el estado con `npm test` y `npm run lint` antes de publicar.');
}

main().catch((error) => {
  showError(error.message);
});

