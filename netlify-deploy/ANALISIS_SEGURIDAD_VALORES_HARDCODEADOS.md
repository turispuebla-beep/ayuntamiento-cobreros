# 🔒 ANÁLISIS DE SEGURIDAD: Valores Hardcodeados en el Código

## ⚠️ RESUMEN EJECUTIVO

**SÍ, hay valores hardcodeados que representan un RIESGO DE SEGURIDAD** si alguien accede al código fuente del proyecto desplegado.

---

## 🚨 VALORES DE ALTO RIESGO (CRÍTICOS)

### **1. Contraseñas de Administradores Hardcodeadas**

**Ubicación**: `js/script.js`

```javascript
// SUPER ADMINISTRADOR
const SUPER_ADMIN = {
    email: 'superadmin@ayuntamientocobreros.es',
    // Password: 29102012 (codificado en base64)
    password: atob('MjkxMDIwMTI='),  // = "29102012"
    name: 'Super Administrador',
    isSuperAdmin: true,
    isHidden: true
};

// ADMINISTRADOR POR DEFECTO
const ADMIN_CREDENTIALS = {
    email: 'admin@ayuntamientocobreros.es',
    // Password: admin123 (codificado en base64)
    password: atob('YWRtaW4xMjM='),  // = "admin123"
    name: 'Administrador Principal',
    isAdmin: true,
    isHidden: true
};
```

**RIESGO**: 🔴 **MUY ALTO**
- Cualquiera que vea el código puede decodificar las contraseñas (base64 es fácil de decodificar)
- Pueden iniciar sesión como administradores
- Pueden acceder a datos sensibles, modificar contenido, eliminar datos

**SOLUCIÓN URGENTE**:
1. ✅ **Cambiar estas contraseñas INMEDIATAMENTE** en Firebase Authentication
2. ✅ **Eliminar estas credenciales hardcodeadas** del código
3. ✅ **Mover las credenciales a variables de entorno** o a un archivo de configuración que NO se suba al repositorio
4. ✅ **Usar el sistema genérico** (`sistema-ayuntamiento-generico`) que carga credenciales desde `config/client-config.js` (que NO se sube a Git)

---

### **2. API Key de Firebase**

**Ubicación**: `index.html` (líneas 86-94)

```javascript
const FIREBASE_API_KEY = ['AI', 'zaSyAwgSjagdxd7pthmRAINDeTIPXx3zAMUeo'].join('');

const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: "turisteam-80f1b.firebaseapp.com",
    projectId: "turisteam-80f1b",
    // ...
};
```

**RIESGO**: 🟡 **MEDIO** (pero debe estar protegida)

**Por qué es menos crítico**:
- Las API Keys de Firebase en frontend son **públicas por diseño** (se exponen en el navegador)
- Firebase usa **reglas de seguridad** para proteger los datos

**PERO**:
- Si la API Key no tiene restricciones de dominio, cualquiera puede usarla
- Puede generar costos no deseados si se usa desde otros dominios

**SOLUCIÓN**:
1. ✅ **Configurar restricciones de dominio** en Firebase Console:
   - Ve a Firebase Console → Project Settings → General
   - En "API Key restrictions", añade solo tu dominio: `www.ayuntamientocobreros.com`
2. ✅ **Revisar las reglas de seguridad** de Firestore y Storage
3. ✅ **Considerar mover a variables de entorno** (aunque en frontend siempre será visible)

---

## 🟡 VALORES DE RIESGO MEDIO

### **3. Emails de Administradores**

**Ubicación**: `js/script.js`

```javascript
email: 'superadmin@ayuntamientocobreros.es'
email: 'admin@ayuntamientocobreros.es'
```

**RIESGO**: 🟡 **MEDIO-BAJO**

**Por qué**:
- Los emails no son secretos en sí mismos
- PERO exponen quiénes son los administradores
- Pueden ser objetivos de ataques de phishing o fuerza bruta

**SOLUCIÓN**:
- ✅ Usar emails genéricos o menos obvios
- ✅ Mover a configuración externa

---

## ✅ VALORES SIN RIESGO (No son un problema)

### **4. Información Pública del Ayuntamiento**

Estos valores **NO son un riesgo** porque son información pública:

- ✅ Nombre del ayuntamiento: "Ayuntamiento de Cobreros"
- ✅ Email de contacto público: "aytocobreros@gmail.com"
- ✅ Teléfono público
- ✅ Dirección pública
- ✅ Nombres de localidades
- ✅ URLs públicas
- ✅ Textos descriptivos

**Estos valores están bien hardcodeados** porque son información que el ayuntamiento quiere que sea pública.

---

## 🛡️ RECOMENDACIONES DE SEGURIDAD

### **ACCIÓN INMEDIATA (URGENTE)**

1. **Cambiar contraseñas en Firebase**:
   ```
   - Ve a Firebase Console → Authentication
   - Cambia la contraseña del super administrador
   - Cambia la contraseña del administrador por defecto
   ```

2. **Eliminar credenciales hardcodeadas del código**:
   - Mover a `config/client-config.js` (que NO se sube a Git)
   - O usar variables de entorno de Netlify

3. **Revisar logs de acceso**:
   - Verificar si alguien ha iniciado sesión con estas credenciales
   - Revisar actividad sospechosa en Firebase Console

### **ACCIÓN A MEDIANO PLAZO**

1. **Migrar a sistema genérico**:
   - Usar `sistema-ayuntamiento-generico` que ya tiene esto resuelto
   - Las credenciales se cargan desde `config/client-config.js` (ignorado por Git)

2. **Configurar restricciones de Firebase**:
   - Restringir API Key por dominio
   - Revisar y endurecer reglas de Firestore
   - Revisar y endurecer reglas de Storage

3. **Implementar autenticación más segura**:
   - Usar Firebase Authentication (ya lo usas, pero asegúrate de que las contraseñas por defecto estén cambiadas)
   - Considerar autenticación de dos factores (2FA) para administradores

### **Buenas Prácticas**

1. **NUNCA hardcodear contraseñas** en código que se despliega
2. **Usar variables de entorno** o archivos de configuración que NO se suban a Git
3. **Cambiar contraseñas por defecto** inmediatamente después de la instalación
4. **Revisar regularmente** quién tiene acceso al código fuente
5. **Usar `.gitignore`** para archivos sensibles (como `config/client-config.js`)

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] **URGENTE**: Cambiar contraseñas de administradores en Firebase
- [ ] **URGENTE**: Eliminar contraseñas hardcodeadas del código
- [ ] **URGENTE**: Verificar si alguien ha usado estas credenciales (revisar logs)
- [ ] Configurar restricciones de dominio para API Key de Firebase
- [ ] Revisar reglas de seguridad de Firestore
- [ ] Revisar reglas de seguridad de Storage
- [ ] Migrar a sistema genérico (usa `config/client-config.js`)
- [ ] Implementar 2FA para administradores (opcional pero recomendado)
- [ ] Revisar quién tiene acceso al repositorio/código fuente
- [ ] Documentar proceso de cambio de contraseñas

---

## 🔐 CÓDIGO ACTUAL vs CÓDIGO SEGURO

### **❌ CÓDIGO ACTUAL (INSEGURO)**

```javascript
// js/script.js - VISIBLE EN EL CÓDIGO FUENTE
const SUPER_ADMIN = {
    email: 'superadmin@ayuntamientocobreros.es',
    password: atob('MjkxMDIwMTI='),  // Cualquiera puede decodificar esto
    // ...
};
```

### **✅ CÓDIGO SEGURO (Sistema Genérico)**

```javascript
// config/client-config.js - NO se sube a Git (.gitignore)
window.CLIENT_CONFIG = {
    superAdmin: {
        email: 'superadmin@ayuntamientocobreros.es',
        password: 'contraseñaSegura123',  // Solo existe en el servidor
        // ...
    }
};

// config.js - Carga la configuración
const CONFIG = deepMerge(DEFAULT_CONFIG, CLIENT_SPECIFIC_CONFIG);
```

**Ventajas**:
- ✅ `config/client-config.js` está en `.gitignore` → NO se sube al repositorio
- ✅ Solo existe en el servidor de producción
- ✅ Cada cliente tiene su propio archivo de configuración
- ✅ Si alguien accede al código fuente, NO verá las credenciales

---

## 🚨 CONCLUSIÓN

**SÍ, hay un riesgo de seguridad real** con las contraseñas hardcodeadas.

**Acción inmediata requerida**:
1. Cambiar las contraseñas en Firebase
2. Eliminar las credenciales hardcodeadas
3. Usar el sistema genérico que ya resuelve este problema

**Los demás valores hardcodeados** (nombres, emails públicos, etc.) **NO son un problema** porque son información pública que el ayuntamiento quiere compartir.

---

**Fecha de análisis**: $(Get-Date -Format "yyyy-MM-dd")
**Proyecto analizado**: `ayuntamiento-cobreros\netlify-deploy`


