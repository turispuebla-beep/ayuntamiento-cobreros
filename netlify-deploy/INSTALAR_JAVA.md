# Instalar Java JDK para Generar el Keystore

## ⚠️ Problema Detectado

El comando `keytool` no se encuentra, lo que significa que:
- Java JDK no está instalado, O
- Java no está en el PATH del sistema

---

## 🚀 Solución: Instalar Java JDK

### Opción 1: Adoptium (Recomendado - Gratis y Open Source)

1. **Ve a**: https://adoptium.net/
2. **Selecciona**:
   - Version: **17 LTS** o **21 LTS** (recomendado)
   - Operating System: **Windows**
   - Architecture: **x64** (para la mayoría de PCs)
3. **Descarga** el instalador `.msi`
4. **Ejecuta el instalador**:
   - ✅ Marca la casilla **"Add to PATH"** (importante)
   - Sigue el asistente de instalación
5. **Reinicia PowerShell** después de instalar

### Opción 2: Oracle JDK (Oficial)

1. **Ve a**: https://www.oracle.com/java/technologies/downloads/
2. **Selecciona**: Java 17 o Java 21
3. **Descarga** el instalador para Windows
4. **Ejecuta el instalador**
5. **Añade Java al PATH manualmente** si es necesario

---

## ✅ Verificar Instalación

Después de instalar, abre PowerShell y ejecuta:

```powershell
java -version
```

Deberías ver algo como:
```
openjdk version "17.0.x" 2024-xx-xx
OpenJDK Runtime Environment (build 17.0.x+x)
OpenJDK 64-Bit Server VM (build 17.0.x+x, mixed mode, sharing)
```

También verifica keytool:

```powershell
keytool -version
```

Deberías ver:
```
keytool version "17.0.x"
```

---

## 🔧 Si Java Está Instalado pero No Funciona

### Problema: Java no está en el PATH

**Solución:**

1. **Encuentra la ubicación de Java**:
   - Generalmente está en: `C:\Program Files\Java\jdk-17\bin`
   - O: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot\bin`

2. **Añade Java al PATH**:
   - Presiona **Windows + R**
   - Escribe: `sysdm.cpl`
   - Ve a la pestaña **"Opciones avanzadas"**
   - Haz clic en **"Variables de entorno"**
   - En **"Variables del sistema"**, busca **"Path"**
   - Haz clic en **"Editar"**
   - Haz clic en **"Nuevo"**
   - Añade la ruta: `C:\Program Files\Java\jdk-17\bin` (o la ruta donde esté tu Java)
   - Haz clic en **"Aceptar"** en todas las ventanas
   - **Reinicia PowerShell**

---

## 📝 Alternativa: Usar la Ruta Completa

Si no quieres añadir Java al PATH, puedes usar la ruta completa:

```powershell
"C:\Program Files\Java\jdk-17\bin\keytool.exe" -genkey -v -keystore cobreros-release-key.jks -alias cobreros -keyalg RSA -keysize 2048 -validity 10000
```

(Reemplaza la ruta con la ubicación real de tu Java)

---

## ✅ Después de Instalar Java

1. **Cierra y vuelve a abrir PowerShell**
2. **Verifica que funciona**: `java -version`
3. **Ejecuta el script de nuevo**: `.\GENERAR_KEYSTORE_SIMPLE.ps1`

---

## 🎯 Resumen

1. ✅ Instala Java JDK desde https://adoptium.net/
2. ✅ Marca "Add to PATH" durante la instalación
3. ✅ Reinicia PowerShell
4. ✅ Verifica con `java -version`
5. ✅ Ejecuta el script: `.\GENERAR_KEYSTORE_SIMPLE.ps1`

---

## 💡 Recomendación

**Usa Adoptium (OpenJDK)** porque:
- ✅ Es gratis
- ✅ Es open source
- ✅ Incluye opción de añadir al PATH automáticamente
- ✅ Funciona perfectamente para generar keystores

¡Una vez instalado Java, podrás generar el keystore sin problemas! 🚀




