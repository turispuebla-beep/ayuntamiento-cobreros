# 🔐 Cómo Guardar y Proteger tu Keystore (.jks)

## ⚠️ IMPORTANTE

**El archivo `.jks` (keystore) es CRÍTICO para tu aplicación.**

Si pierdes este archivo o su contraseña:
- ❌ **NO podrás actualizar tu app en Google Play**
- ❌ **NO podrás publicar nuevas versiones**
- ❌ **Tendrás que crear una nueva app desde cero**

---

## 📁 Dónde Guardar el Keystore

### ✅ Ubicaciones Recomendadas:

1. **USB de respaldo encriptado**:
   - Guarda el `.jks` en un USB
   - Encripta el USB con BitLocker o similar
   - Guarda el USB en un lugar seguro (caja fuerte, oficina)

2. **Servicio de almacenamiento en la nube**:
   - Google Drive, Dropbox, OneDrive, etc.
   - ⚠️ **IMPORTANTE**: Encripta el archivo antes de subirlo
   - Usa una contraseña fuerte para el archivo ZIP encriptado

3. **Múltiples ubicaciones**:
   - Guarda copias en al menos 2-3 lugares diferentes
   - No pongas todos los huevos en la misma canasta

4. **Gestor de contraseñas**:
   - Guarda la contraseña del keystore en un gestor seguro
   - Ejemplos: LastPass, 1Password, Bitwarden, etc.

---

## 🔒 Cómo Encriptar el Keystore

### Opción 1: Usar ZIP con contraseña (Windows)

1. **Clic derecho** en el archivo `.jks`
2. **Enviar a** → **Carpeta comprimida (en ZIP)**
3. **Clic derecho** en el ZIP → **Propiedades** → **Avanzado**
4. **Marcar "Cifrar contenido para proteger datos"**
5. O usar **7-Zip** o **WinRAR** para crear un ZIP con contraseña

### Opción 2: Usar PowerShell (Recomendado)

```powershell
# Comprimir y encriptar el keystore
Compress-Archive -Path "cobreros-release-key.jks" -DestinationPath "cobreros-keystore-backup.zip" -Force

# Luego encripta el ZIP con BitLocker o similar
```

### Opción 3: Usar herramientas de encriptación

- **VeraCrypt**: Crea un volumen encriptado
- **7-Zip**: Comprime con contraseña AES-256
- **BitLocker**: Encripta el USB o carpeta completa

---

## 📝 Información a Guardar

Crea un documento (encriptado) con:

```
INFORMACIÓN DEL KEYSTORE
========================

Archivo: cobreros-release-key.jks
Alias: cobreros
Contraseña: [GUARDAR EN GESTOR DE CONTRASEÑAS]

Ubicación del archivo:
- USB de respaldo: [ruta]
- Nube: [servicio y ruta]
- Oficina: [ubicación física]

Fecha de creación: [fecha]
Creado por: [nombre]

NOTAS:
- Usar SOLO para firmar APKs de Ayuntamiento de Cobreros
- NO compartir con nadie
- Guardar en múltiples ubicaciones
```

---

## 🔑 Guardar la Contraseña

### ✅ Opciones Seguras:

1. **Gestor de contraseñas**:
   - LastPass, 1Password, Bitwarden, etc.
   - Crea una entrada: "Keystore Google Play - Ayuntamiento Cobreros"

2. **Documento encriptado**:
   - Guarda la contraseña en un documento
   - Encripta el documento con contraseña
   - Guarda en ubicación segura

3. **Caja fuerte física**:
   - Escribe la contraseña en papel
   - Guarda en caja fuerte o lugar seguro
   - ⚠️ No la dejes a la vista

### ❌ NO Hacer:

- ❌ Guardar la contraseña en un archivo de texto sin encriptar
- ❌ Enviar por email sin encriptar
- ❌ Guardar solo en el ordenador (sin backup)
- ❌ Compartir con personas no autorizadas

---

## 📋 Checklist de Seguridad

- [ ] Keystore guardado en USB encriptado
- [ ] Keystore guardado en nube (encriptado)
- [ ] Contraseña guardada en gestor de contraseñas
- [ ] Información del keystore documentada
- [ ] Backup en al menos 2 ubicaciones diferentes
- [ ] Archivos encriptados antes de guardar
- [ ] Ubicaciones físicas seguras identificadas

---

## 🔄 Actualizaciones Futuras

**IMPORTANTE**: Usa SIEMPRE el mismo keystore para todas las versiones:

1. **Primera versión**: Usa `cobreros-release-key.jks`
2. **Versión 1.1**: Usa el MISMO `cobreros-release-key.jks`
3. **Versión 1.2**: Usa el MISMO `cobrores-release-key.jks`
4. **Todas las versiones**: Mismo keystore, misma contraseña

Si usas un keystore diferente, Google Play rechazará la actualización.

---

## 🚨 Qué Hacer si Pierdes el Keystore

### Si pierdes el archivo `.jks`:

1. **Busca en todas las ubicaciones de backup**
2. **Revisa servicios de nube**
3. **Revisa USBs de respaldo**

### Si no lo encuentras:

- ❌ **NO podrás actualizar la app existente**
- ✅ **Puedes crear una nueva app** (pero perderás descargas, reseñas, etc.)
- ⚠️ **Es mejor prevenir que curar**

---

## 💡 Mejores Prácticas

1. **Haz backup inmediatamente** después de crear el keystore
2. **Verifica los backups** periódicamente (cada 6 meses)
3. **Documenta todo** (ubicaciones, contraseñas, fechas)
4. **Comparte la información** con alguien de confianza (si es necesario)
5. **Actualiza los backups** si cambias algo

---

## 📞 Contacto de Emergencia

Si pierdes el keystore y necesitas ayuda:

1. Revisa esta guía primero
2. Busca en todas las ubicaciones posibles
3. Si realmente está perdido, tendrás que crear una nueva app

**Prevención es la mejor solución.**

---

## ✅ Resumen

**Guarda el keystore en:**
- ✅ USB encriptado
- ✅ Nube encriptada
- ✅ Múltiples ubicaciones

**Guarda la contraseña en:**
- ✅ Gestor de contraseñas
- ✅ Documento encriptado
- ✅ Caja fuerte física

**Haz backup:**
- ✅ Inmediatamente después de crear
- ✅ Verifica periódicamente
- ✅ Múltiples copias en diferentes lugares

**¡Protege tu keystore como protegerías las llaves de tu casa! 🔐**




