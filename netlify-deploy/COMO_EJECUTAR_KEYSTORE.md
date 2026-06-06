# 📍 Dónde y Cómo Ejecutar el Script del Keystore

## 🚀 Pasos para Ejecutar el Script

### Paso 1: Abrir PowerShell

**Opción A: Desde el Explorador de Archivos (Más Fácil)**

1. Abre el **Explorador de Archivos** (Windows + E)
2. Navega a esta carpeta:
   ```
   C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy
   ```
3. **Clic derecho** en un espacio vacío de la carpeta
4. Selecciona **"Abrir en Terminal"** o **"Abrir ventana de PowerShell aquí"**

**Opción B: Desde el Menú Inicio**

1. Presiona **Windows + X**
2. Selecciona **"Windows PowerShell"** o **"Terminal"**
3. Escribe:
   ```powershell
   cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
   ```
4. Presiona **Enter**

**Opción C: Desde la Barra de Direcciones**

1. Abre el **Explorador de Archivos**
2. Ve a la carpeta: `C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy`
3. En la barra de direcciones, escribe: `powershell`
4. Presiona **Enter**

---

### Paso 2: Verificar que Estás en la Carpeta Correcta

En PowerShell, escribe:
```powershell
pwd
```

Deberías ver:
```
C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy
```

Si no estás en esa carpeta, escribe:
```powershell
cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
```

---

### Paso 3: Verificar que el Archivo Existe

Escribe:
```powershell
dir GENERAR_KEYSTORE.ps1
```

Deberías ver el archivo listado. Si no aparece, verifica que estás en la carpeta correcta.

---

### Paso 4: Ejecutar el Script

**IMPORTANTE**: Si aparece un error de "ejecución de scripts deshabilitada", primero ejecuta esto:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Luego ejecuta el script:

```powershell
.\GENERAR_KEYSTORE.ps1
```

O también puedes escribir:

```powershell
powershell -ExecutionPolicy Bypass -File .\GENERAR_KEYSTORE.ps1
```

---

## ⚠️ Si Aparece un Error de Permisos

### Error: "No se puede cargar porque la ejecución de scripts está deshabilitada"

**Solución:**

1. Abre PowerShell como **Administrador**:
   - Clic derecho en PowerShell → **"Ejecutar como administrador"**

2. Ejecuta este comando:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. Escribe **"S"** (Sí) cuando te pregunte

4. Vuelve a ejecutar el script:
   ```powershell
   cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
   .\GENERAR_KEYSTORE.ps1
   ```

---

## ✅ Verificación Rápida

**Ruta completa del archivo:**
```
C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\GENERAR_KEYSTORE.ps1
```

**Comando completo para ejecutar:**
```powershell
cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
.\GENERAR_KEYSTORE.ps1
```

---

## 📝 Resumen Visual

```
1. Abre PowerShell
   ↓
2. Navega a la carpeta:
   cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
   ↓
3. Ejecuta el script:
   .\GENERAR_KEYSTORE.ps1
   ↓
4. Sigue las instrucciones en pantalla
```

---

## 🆘 Si Tienes Problemas

### Problema 1: "No se encuentra el archivo"

**Solución:**
- Verifica que estás en la carpeta correcta con `pwd`
- Verifica que el archivo existe con `dir GENERAR_KEYSTORE.ps1`
- Si no existe, verifica la ruta completa

### Problema 2: "Java no está instalado"

**Solución:**
- Instala Java JDK desde: https://adoptium.net/
- O desde: https://www.oracle.com/java/technologies/downloads/
- Reinicia PowerShell después de instalar

### Problema 3: "keytool no se reconoce"

**Solución:**
- Verifica que Java está instalado: `java -version`
- Añade Java al PATH si es necesario
- O usa la ruta completa a keytool

---

## 💡 Consejo

**La forma más fácil:**

1. Abre el **Explorador de Archivos**
2. Ve a: `C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy`
3. **Clic derecho** en un espacio vacío
4. **"Abrir en Terminal"** o **"Abrir ventana de PowerShell aquí"**
5. Escribe: `.\GENERAR_KEYSTORE.ps1`
6. Presiona **Enter**

¡Eso es todo! 🚀




