# 🧪 Guía de Pruebas - Mejoras de Prioridad Alta

## ✅ Estado de Verificación

Todas las mejoras han sido verificadas automáticamente:
- ✅ Migración a Firebase Secrets: **COMPLETA**
- ✅ Sistema de backup: **FUNCIONAL**
- ✅ Optimización de logs: **IMPLEMENTADA**
- ⚠️ 81 console.log aún presentes (opcional optimizar)

---

## 1️⃣ Prueba: Migración a Firebase Secrets

### Verificación Automática
```bash
node scripts/verificar-mejoras.js
```

### Verificación Manual

**1. Verificar código:**
```bash
# Verificar que NO use functions.config()
grep -n "functions.config()" functions/src/index.ts
# No debe encontrar nada

# Verificar que use Secrets
grep -n "runWith.*secrets" functions/src/index.ts
# Debe encontrar: .runWith({ secrets: ['GMAIL_PASSWORD'] })
```

**2. Configurar Secret (PRIMERA VEZ):**
```bash
# Configurar el secret de Gmail
firebase functions:secrets:set GMAIL_PASSWORD

# Se pedirá ingresar el valor (la contraseña de Gmail)
# Ingresar: [tu contraseña de Gmail]
```

**3. Verificar que está configurado:**
```bash
# Listar todos los secrets
firebase functions:secrets:list

# Debe mostrar: GMAIL_PASSWORD
```

**4. Probar función:**
```bash
# Desplegar funciones
firebase deploy --only functions:sendEmail

# Probar enviando un email de prueba
# (Desde el panel de admin o usando curl)
```

**5. Verificar logs:**
```bash
# Ver logs de la función
firebase functions:log --only sendEmail

# Si el secret no está configurado, verás:
# ❌ GMAIL_PASSWORD no configurada...
# Error: GMAIL_PASSWORD secret no configurado...
```

---

## 2️⃣ Prueba: Sistema de Backup Automático

### Verificación Automática
El script ya verificó que:
- ✅ Función `createDailyBackup` existe
- ✅ Está programada para las 2:00 AM
- ✅ Timezone: Europe/Madrid

### Verificación Manual

**1. Verificar función en código:**
```bash
# Buscar función de backup
grep -n "createDailyBackup" functions/src/index.ts

# Debe encontrar la función exportada
```

**2. Verificar programación:**
```bash
# Verificar schedule
grep -n "schedule('0 2 \* \* \*')" functions/src/index.ts

# Debe encontrar: .schedule('0 2 * * *')
```

**3. Desplegar función:**
```bash
# Desplegar solo la función de backup
firebase deploy --only functions:createDailyBackup
```

**4. Verificar en Firebase Console:**
1. Ir a Firebase Console → Functions
2. Buscar `createDailyBackup`
3. Verificar que esté desplegada
4. Verificar que tenga trigger: "Cloud Scheduler"

**5. Probar manualmente (opcional):**
```bash
# Ver logs de backup
firebase functions:log --only createDailyBackup

# Verificar backups en Firestore:
# 1. Ir a Firebase Console → Firestore
# 2. Buscar colección "backups"
# 3. Debe haber documentos con formato de timestamp
```

**6. Verificar backup automático:**
- Esperar a las 2:00 AM (hora de Madrid)
- O cambiar temporalmente el schedule a `'*/5 * * * *'` (cada 5 minutos) para probar
- Verificar que se cree un documento en `backups`

---

## 3️⃣ Prueba: Optimización de Console.log

### Verificación Automática
El script verificó:
- ✅ Sistema Logger existe
- ✅ DEBUG_MODE configurado
- ✅ Logger.log se usa (17 veces)
- ⚠️ 81 console.log aún presentes

### Verificación Manual

**1. Verificar Logger:**
```bash
# Verificar que Logger existe
grep -n "const Logger" js/script.js

# Verificar DEBUG_MODE
grep -n "const DEBUG_MODE" js/script.js
```

**2. Probar en desarrollo (localhost):**
```javascript
// Abrir consola del navegador en localhost
// Logger.log debe funcionar
Logger.log('Test en desarrollo'); // ✅ Debe aparecer

// console.log también debe funcionar
console.log('Test console.log'); // ✅ Debe aparecer
```

**3. Probar en producción:**
```javascript
// Abrir consola del navegador en producción
// Logger.log NO debe funcionar (solo en localhost)
Logger.log('Test en producción'); // ❌ NO debe aparecer

// console.error siempre debe funcionar
Logger.error('Error crítico'); // ✅ Debe aparecer siempre
```

**4. Activar modo debug en producción (opcional):**
```javascript
// En consola del navegador
localStorage.setItem('debugMode', 'true');
// Recargar página
// Ahora Logger.log funcionará también en producción
```

**5. Contar console.log vs Logger.log:**
```bash
# Contar console.log
grep -c "console\.log" js/script.js

# Contar Logger.log
grep -c "Logger\.log" js/script.js
```

---

## 4️⃣ Prueba: Script de Minificación

### Verificación Automática
✅ Script existe en `scripts/minify.js`

### Verificación Manual

**1. Verificar que existe:**
```bash
ls scripts/minify.js
```

**2. Instalar dependencias (si es necesario):**
```bash
# Terser se puede usar con npx (no requiere instalación global)
# O instalar globalmente:
npm install -g terser
```

**3. Ejecutar minificación:**
```bash
node scripts/minify.js
```

**4. Verificar archivo minificado:**
```bash
# Debe crear js/script.min.js
ls -lh js/script.min.js

# Comparar tamaños
ls -lh js/script.js js/script.min.js
```

**5. Usar archivo minificado (opcional):**
```html
<!-- En index.html, cambiar: -->
<script src="js/script.js"></script>
<!-- Por: -->
<script src="js/script.min.js"></script>
```

---

## 📋 Checklist de Pruebas Completas

### Antes de Desplegar:
- [ ] Ejecutar: `node scripts/verificar-mejoras.js` (debe pasar todas)
- [ ] Configurar Firebase Secret: `firebase functions:secrets:set GMAIL_PASSWORD`
- [ ] Verificar secret: `firebase functions:secrets:list`

### Después de Desplegar:
- [ ] Desplegar funciones: `firebase deploy --only functions`
- [ ] Verificar logs: `firebase functions:log --only sendEmail`
- [ ] Verificar logs de backup: `firebase functions:log --only createDailyBackup`
- [ ] Probar envío de email (desde panel admin)
- [ ] Verificar backups en Firestore (colección `backups`)

### Pruebas de Funcionalidad:
- [ ] Probar registro de usuario (debe funcionar)
- [ ] Probar solicitud de cita previa (debe enviar email)
- [ ] Verificar que Logger.log no aparece en producción
- [ ] Verificar que console.error siempre aparece

---

## 🐛 Solución de Problemas

### Error: "GMAIL_PASSWORD secret no configurado"
**Solución:**
```bash
firebase functions:secrets:set GMAIL_PASSWORD
# Ingresar la contraseña cuando se solicite
```

### Error: "Function failed to load"
**Solución:**
- Verificar que el secret esté configurado
- Verificar sintaxis de TypeScript: `npm run build` en `functions/`
- Ver logs: `firebase functions:log`

### Backup no se ejecuta
**Solución:**
- Verificar que la función esté desplegada
- Verificar schedule en Firebase Console → Functions
- Verificar timezone (debe ser Europe/Madrid)
- Ver logs: `firebase functions:log --only createDailyBackup`

### Logger.log aparece en producción
**Solución:**
- Verificar que `DEBUG_MODE` esté correctamente configurado
- Verificar que no haya `localStorage.setItem('debugMode', 'true')` activo
- Limpiar localStorage: `localStorage.removeItem('debugMode')`

---

## 📊 Resultados Esperados

### Verificación Automática:
```
✅ ÉXITOS: 11
⚠️  ADVERTENCIAS: 1 (81 console.log - opcional)
❌ ERRORES: 0
```

### Funciones Desplegadas:
- ✅ `sendEmail` - Con Firebase Secrets
- ✅ `sendPushNotification` - Sin cambios
- ✅ `createDailyBackup` - Programada diariamente

### Archivos Creados:
- ✅ `scripts/verificar-mejoras.js` - Script de verificación
- ✅ `scripts/minify.js` - Script de minificación
- ✅ `MEJORAS-PRIORIDAD-ALTA.md` - Documentación
- ✅ `GUIA-PRUEBAS-MEJORAS.md` - Esta guía

---

**Fecha de creación:** $(date)
**Última actualización:** $(date)

