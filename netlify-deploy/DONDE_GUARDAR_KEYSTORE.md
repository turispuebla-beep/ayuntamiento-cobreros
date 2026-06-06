# 📍 Dónde Guardar el Keystore (.jks)

## ✅ Ubicación Actual

El archivo `cobreros-release-key.jks` está actualmente en:
```
C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\cobreros-release-key.jks
```

**⚠️ NO dejes el archivo solo ahí. Haz backups en múltiples lugares.**

---

## 💾 Dónde Guardarlo (Múltiples Ubicaciones)

### 1. **USB de Respaldo** (Recomendado - Físico)

**Pasos:**
1. Conecta un USB
2. Crea una carpeta: `BACKUP_KEYSTORE_COBREROS`
3. Copia el archivo: `cobreros-release-key.jks`
4. **Encripta el USB** con BitLocker (si es posible)
5. Guarda el USB en un lugar seguro (caja fuerte, oficina, etc.)

**Ubicación sugerida:**
```
USB:\BACKUP_KEYSTORE_COBREROS\cobreros-release-key.jks
```

---

### 2. **Nube Encriptada** (Recomendado - Digital)

**Opción A: Google Drive / Dropbox / OneDrive**

1. **Comprime el archivo con contraseña**:
   - Clic derecho en `cobreros-release-key.jks`
   - "Enviar a" → "Carpeta comprimida (en ZIP)"
   - Clic derecho en el ZIP → "Agregar al archivo..." (si usas 7-Zip)
   - Añade una contraseña fuerte
   - O usa WinRAR para crear un ZIP con contraseña

2. **Sube el ZIP encriptado** a:
   - Google Drive
   - Dropbox
   - OneDrive
   - O cualquier servicio de nube

**Ubicación sugerida:**
```
Google Drive:\Backups\cobreros-release-key.jks.zip (con contraseña)
```

---

### 3. **Otro Disco/Ordenador** (Respaldo Adicional)

1. Copia el archivo a otro disco duro
2. O a otro ordenador
3. O a un disco externo

**Ubicación sugerida:**
```
D:\Backups\KEYSTORE\cobreros-release-key.jks
```

---

### 4. **Carpeta de Proyecto** (Para Uso Diario)

**Puedes dejarlo en la carpeta del proyecto** para usarlo cuando firmes APKs:

```
C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\cobreros-release-key.jks
```

**PERO** asegúrate de tener backups en otros lugares.

---

## 🔐 Guardar la Contraseña

### Opción 1: Gestor de Contraseñas (Recomendado)

**Servicios recomendados:**
- **LastPass** (https://www.lastpass.com/)
- **1Password** (https://1password.com/)
- **Bitwarden** (https://bitwarden.com/) - Gratis
- **KeePass** (https://keepass.info/) - Gratis y local

**Crea una entrada:**
```
Título: Keystore Google Play - Ayuntamiento Cobreros
Archivo: cobreros-release-key.jks
Alias: cobreros
Contraseña: [Tu contraseña]
Ubicación: C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\
```

---

### Opción 2: Documento Encriptado

1. Crea un documento Word o texto
2. Escribe la información del keystore
3. Guarda el documento con contraseña
4. Guarda el documento encriptado en la nube o USB

---

### Opción 3: Caja Fuerte Física

1. Escribe la contraseña en papel
2. Guarda en una caja fuerte o lugar seguro
3. ⚠️ No la dejes a la vista

---

## 📋 Checklist de Backups

- [ ] Backup en USB (encriptado si es posible)
- [ ] Backup en nube (comprimido con contraseña)
- [ ] Backup en otro disco/ordenador
- [ ] Contraseña guardada en gestor de contraseñas
- [ ] Información documentada (alias, ubicación, etc.)

---

## 🎯 Resumen: Dónde Guardar

### Para Uso Diario:
```
C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\cobreros-release-key.jks
```
✅ Déjalo aquí para firmar APKs fácilmente

### Para Backup (Mínimo 2 lugares):
1. **USB encriptado** → Guarda en lugar físico seguro
2. **Nube encriptada** → Google Drive/Dropbox con ZIP con contraseña

### Para la Contraseña:
- **Gestor de contraseñas** → LastPass, 1Password, Bitwarden, etc.

---

## ⚠️ Recordatorio

**Si pierdes el archivo O la contraseña:**
- ❌ NO podrás actualizar tu app en Google Play
- ❌ Tendrás que crear una nueva app desde cero

**Por eso es CRÍTICO tener múltiples backups.**

---

## ✅ Acción Inmediata Recomendada

1. **Copia el archivo a un USB** (hazlo ahora)
2. **Comprime con contraseña y súbelo a Google Drive**
3. **Guarda la contraseña en un gestor de contraseñas**

¡Hazlo ahora antes de que sea demasiado tarde! 🔐




