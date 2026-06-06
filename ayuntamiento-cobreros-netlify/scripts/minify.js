#!/usr/bin/env node

/**
 * Script de minificación para producción
 * Uso: node scripts/minify.js
 * 
 * Requiere: npm install -g terser
 * O usar: npx terser
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filesToMinify = [
  { input: 'js/script.js', output: 'js/script.min.js' },
  // Agregar más archivos si es necesario
];

console.log('🔨 Iniciando minificación...\n');

filesToMinify.forEach(({ input, output }) => {
  const inputPath = path.join(__dirname, '..', input);
  const outputPath = path.join(__dirname, '..', output);
  
  if (!fs.existsSync(inputPath)) {
    console.warn(`⚠️  Archivo no encontrado: ${input}`);
    return;
  }
  
  try {
    // Usar terser para minificar
    const command = `npx terser "${inputPath}" -o "${outputPath}" --compress --mangle --comments false`;
    execSync(command, { stdio: 'inherit' });
    
    const originalSize = fs.statSync(inputPath).size;
    const minifiedSize = fs.statSync(outputPath).size;
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
    
    console.log(`✅ ${input}`);
    console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Minificado: ${(minifiedSize / 1024).toFixed(2)} KB`);
    console.log(`   Reducción: ${reduction}%\n`);
  } catch (error) {
    console.error(`❌ Error minificando ${input}:`, error.message);
  }
});

console.log('✨ Minificación completada');

