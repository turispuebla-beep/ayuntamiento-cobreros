#!/usr/bin/env node

/**
 * Crea un snapshot del estado actual del proyecto dentro de la carpeta `snapshots/`.
 * Permite volver a una versión conocida si una actualización no sale como se esperaba.
 */

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'snapshots');

const timestamp = new Date().toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .replace('Z', '');

const snapshotDir = path.join(outputRoot, timestamp);

const itemsToCopy = [
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
  console.log(`[snapshot] ${message}`);
}

async function ensureDir(dir) {
  await fse.ensureDir(dir);
}

async function copyItem(item) {
  const sourcePath = path.join(projectRoot, item);
  const destinationPath = path.join(snapshotDir, item);

  try {
    const exists = await fse.pathExists(sourcePath);
    if (!exists) {
      log(`⚠️  Elemento no encontrado, se omite: ${item}`);
      return;
    }

    await fse.copy(sourcePath, destinationPath, {
      overwrite: true,
      errorOnExist: false
    });
    log(`✅ Copiado: ${item}`);
  } catch (error) {
    log(`❌ Error copiando ${item}: ${error.message}`);
    throw error;
  }
}

async function createMetadataFile() {
  const metadata = {
    createdAt: new Date().toISOString(),
    items: itemsToCopy,
    gitStatus: (() => {
      try {
        const { execSync } = require('child_process');
        return execSync('git status -sb', {
          cwd: projectRoot,
          stdio: ['ignore', 'pipe', 'ignore']
        }).toString().trim();
      } catch (_) {
        return 'No disponible';
      }
    })()
  };

  const metadataPath = path.join(snapshotDir, 'snapshot-info.json');
  await fse.writeJson(metadataPath, metadata, { spaces: 2 });
}

async function main() {
  try {
    await ensureDir(outputRoot);
    await ensureDir(snapshotDir);

    log(`Creando snapshot en: ${snapshotDir}`);

    for (const item of itemsToCopy) {
      // eslint-disable-next-line no-await-in-loop
      await copyItem(item);
    }

    await createMetadataFile();

    log('✨ Snapshot completado con éxito');
    log('Para revertir, copia manualmente los archivos de la carpeta snapshot deseada sobre el proyecto actual.');
  } catch (error) {
    log(`❌ Snapshot fallido: ${error.message}`);
    process.exitCode = 1;
  }
}

main();

