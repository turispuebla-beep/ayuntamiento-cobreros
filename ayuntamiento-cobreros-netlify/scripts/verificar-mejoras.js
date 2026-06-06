#!/usr/bin/env node

/**
 * Script de verificación de mejoras de prioridad alta
 * Verifica:
 * 1. Migración a Firebase Secrets
 * 2. Sistema de backup
 * 3. Optimización de console.log
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando mejoras de prioridad alta...\n');

let errors = [];
let warnings = [];
let success = [];

// 1. Verificar migración a Firebase Secrets
console.log('1️⃣ Verificando migración a Firebase Secrets...');
try {
    const indexTs = fs.readFileSync('functions/src/index.ts', 'utf8');
    
    // Verificar que NO use functions.config()
    if (indexTs.includes('functions.config()')) {
        errors.push('❌ Todavía se usa functions.config() - debe migrarse a Secrets');
    } else {
        success.push('✅ No se usa functions.config()');
    }
    
    // Verificar que use runWith({ secrets: ['GMAIL_PASSWORD'] })
    if (indexTs.includes("runWith({ secrets: ['GMAIL_PASSWORD'] })")) {
        success.push('✅ Usa runWith({ secrets: [\'GMAIL_PASSWORD\'] })');
    } else {
        warnings.push('⚠️  No se encontró runWith({ secrets: [\'GMAIL_PASSWORD\'] })');
    }
    
    // Verificar que use process.env.GMAIL_PASSWORD
    if (indexTs.includes('process.env.GMAIL_PASSWORD')) {
        success.push('✅ Usa process.env.GMAIL_PASSWORD');
    } else {
        errors.push('❌ No se usa process.env.GMAIL_PASSWORD');
    }
    
    // Verificar que tenga throw Error si no está configurado
    if (indexTs.includes('throw new Error') && indexTs.includes('GMAIL_PASSWORD')) {
        success.push('✅ Tiene validación de error si GMAIL_PASSWORD no está configurado');
    } else {
        warnings.push('⚠️  No se encontró validación de error para GMAIL_PASSWORD');
    }
    
} catch (error) {
    errors.push(`❌ Error leyendo functions/src/index.ts: ${error.message}`);
}

// 2. Verificar sistema de backup
console.log('2️⃣ Verificando sistema de backup...');
try {
    const indexTs = fs.readFileSync('functions/src/index.ts', 'utf8');
    
    // Verificar que exista createDailyBackup
    if (indexTs.includes('createDailyBackup')) {
        success.push('✅ Función createDailyBackup existe');
        
        // Verificar que tenga schedule
        if (indexTs.includes('schedule(\'0 2 * * *\')')) {
            success.push('✅ Backup programado para las 2:00 AM');
        } else {
            warnings.push('⚠️  No se encontró schedule para backup');
        }
        
        // Verificar timezone
        if (indexTs.includes('timeZone(\'Europe/Madrid\')')) {
            success.push('✅ Timezone configurado a Europe/Madrid');
        }
    } else {
        errors.push('❌ No se encontró función createDailyBackup');
    }
    
} catch (error) {
    errors.push(`❌ Error verificando backup: ${error.message}`);
}

// 3. Verificar optimización de console.log
console.log('3️⃣ Verificando optimización de console.log...');
try {
    const scriptJs = fs.readFileSync('js/script.js', 'utf8');
    
    // Verificar que exista Logger
    if (scriptJs.includes('const Logger = {')) {
        success.push('✅ Sistema Logger existe');
        
        // Verificar DEBUG_MODE
        if (scriptJs.includes('const DEBUG_MODE')) {
            success.push('✅ DEBUG_MODE configurado');
        }
        
        // Contar console.log
        const consoleLogMatches = scriptJs.match(/console\.log\(/g);
        const consoleLogCount = consoleLogMatches ? consoleLogMatches.length : 0;
        
        if (consoleLogCount > 0) {
            warnings.push(`⚠️  Se encontraron ${consoleLogCount} console.log - considerar usar Logger.log`);
        } else {
            success.push('✅ No se encontraron console.log (ya optimizado)');
        }
        
        // Verificar que Logger.log se use
        const loggerLogMatches = scriptJs.match(/Logger\.log\(/g);
        const loggerLogCount = loggerLogMatches ? loggerLogMatches.length : 0;
        
        if (loggerLogCount > 0) {
            success.push(`✅ Se usa Logger.log (${loggerLogCount} veces)`);
        } else {
            warnings.push('⚠️  No se encontró uso de Logger.log');
        }
        
    } else {
        errors.push('❌ No se encontró sistema Logger');
    }
    
} catch (error) {
    errors.push(`❌ Error verificando script.js: ${error.message}`);
}

// 4. Verificar script de minificación
console.log('4️⃣ Verificando script de minificación...');
try {
    if (fs.existsSync('scripts/minify.js')) {
        success.push('✅ Script de minificación existe (scripts/minify.js)');
    } else {
        warnings.push('⚠️  Script de minificación no encontrado');
    }
} catch (error) {
    warnings.push(`⚠️  Error verificando script de minificación: ${error.message}`);
}

// Resumen
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIÓN');
console.log('='.repeat(60));

if (success.length > 0) {
    console.log('\n✅ ÉXITOS:');
    success.forEach(msg => console.log(`   ${msg}`));
}

if (warnings.length > 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    warnings.forEach(msg => console.log(`   ${msg}`));
}

if (errors.length > 0) {
    console.log('\n❌ ERRORES:');
    errors.forEach(msg => console.log(`   ${msg}`));
    console.log('\n⚠️  Hay errores que deben corregirse antes de desplegar.');
    process.exit(1);
} else {
    console.log('\n✨ Todas las verificaciones pasaron correctamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Configurar Firebase Secret: firebase functions:secrets:set GMAIL_PASSWORD');
    console.log('   2. Desplegar funciones: firebase deploy --only functions');
    console.log('   3. Verificar logs: firebase functions:log --only createDailyBackup');
    process.exit(0);
}

