# 🔐 SOLUCIÓN DE SEGURIDAD: Eliminar Credenciales Hardcodeadas

## ❌ POR QUÉ CIFRAR NO ES LA SOLUCIÓN

### **Problema con cifrado en Frontend:**

1. **Cualquier cifrado en JavaScript es inútil**:
   - El código JavaScript se ejecuta en el navegador del usuario
   - Cualquiera puede ver el código fuente completo
   - Si hay una clave de cifrado, también está visible en el código
   - Un atacante puede copiar el código, ver la clave, y descifrar las contraseñas

2. **Base64 NO es cifrado**:
   - Base64 es solo **codificación**, no cifrado
   - Es como escribir en otro idioma, pero cualquiera puede traducirlo
   - Se decodifica instantáneamente con `atob()` o cualquier herramienta online

3. **Ejemplo del problema actual**:
   ```javascript
   // Código actual (INSEGURO)
   password: atob('YWRtaW4xMjM=')  // = "admin123"
   
   // Cualquiera puede hacer esto en la consola del navegador:
   atob('YWRtaW4xMjM=')  // Resultado: "admin123"
   ```

---

## ✅ LA SOLUCIÓN CORRECTA

### **Opción 1: Eliminar credenciales del código (RECOMENDADO)**

**NO hardcodear credenciales en absoluto**. En su lugar:

1. **Usar Firebase Authentication directamente**:
   - Las contraseñas se almacenan en Firebase (servidor)
   - El código solo verifica credenciales contra Firebase
   - No hay contraseñas en el código fuente

2. **O usar archivo de configuración externo**:
   - Crear `config/client-config.js` (que NO se sube a Git)
   - Cargar credenciales desde ese archivo
   - El archivo solo existe en el servidor de producción

---

## 🛠️ IMPLEMENTACIÓN DE LA SOLUCIÓN

### **PASO 1: Eliminar credenciales hardcodeadas del código**

**Archivo**: `js/script.js`

**ELIMINAR estas líneas**:

```javascript
// ❌ ELIMINAR ESTO
const SUPER_ADMIN = {
    email: atob('ZWRpdG9ydHVyaXNAZ21haWwuY29t'),
    password: atob('MjkxMDIwMTI='),
    name: 'Super Admin',
    isSuperAdmin: true,
    isHidden: true
};

const ADMIN_CREDENTIALS = {
    email: atob('YXl0b2NvYnJlcm9zQGdtYWlsLmNvbQ=='),
    password: atob('YWRtaW4xMjM='),
    name: 'Administrador Ayuntamiento',
    isAdmin: true,
    isHidden: true
};
```

---

### **PASO 2: Usar Firebase Authentication (Solución Segura)**

**Reemplazar con autenticación real de Firebase**:

```javascript
// ✅ CÓDIGO SEGURO - Usar Firebase Authentication
async function authenticateAdmin(email, password) {
    try {
        // Autenticar con Firebase (las contraseñas están en el servidor)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Verificar si el usuario es administrador en Firestore
        const userDoc = await getDoc(doc(db, 'administrators', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isAdmin || userData.isSuperAdmin) {
                // Usuario es administrador
                currentUser = userData;
                isAdmin = userData.isAdmin;
                isSuperAdmin = userData.isSuperAdmin;
                return { success: true, user: userData };
            }
        }
        
        // Si no es administrador, cerrar sesión
        await signOut(auth);
        return { success: false, error: 'No tiene permisos de administrador' };
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        return { success: false, error: error.message };
    }
}
```

---

### **PASO 3: Crear usuarios administradores en Firebase**

1. **Ve a Firebase Console** → Authentication
2. **Crea los usuarios administradores**:
   - Email: `superadmin@ayuntamientocobreros.es`
   - Contraseña: (nueva contraseña segura)
   - Email: `admin@ayuntamientocobreros.es`
   - Contraseña: (nueva contraseña segura)

3. **Crear documentos en Firestore**:

```javascript
// Colección: administrators
// Documento ID: [user-uid-de-firebase]

{
    email: "superadmin@ayuntamientocobreros.es",
    name: "Super Administrador",
    isSuperAdmin: true,
    isAdmin: true,
    isHidden: true,
    createdAt: Timestamp,
    team: "TURISTEAM"
}

{
    email: "admin@ayuntamientocobreros.es",
    name: "Administrador Principal",
    isAdmin: true,
    isHidden: true,
    createdAt: Timestamp
}
```

---

### **PASO 4: Actualizar función de login**

**Reemplazar la función de login actual**:

```javascript
// ❌ CÓDIGO ACTUAL (INSEGURO)
function processUserLogin({ email, password, rememberSession = false }) {
    // Verificar credenciales hardcodeadas
    if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
        isSuperAdmin = true;
        // ...
    }
    // ...
}

// ✅ CÓDIGO SEGURO
async function processUserLogin({ email, password, rememberSession = false }) {
    try {
        // Autenticar con Firebase
        const result = await authenticateAdmin(email, password);
        
        if (result.success) {
            // Guardar sesión si se solicita
            if (rememberSession) {
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                localStorage.setItem('isAdmin', result.user.isAdmin ? 'true' : 'false');
                localStorage.setItem('isSuperAdmin', result.user.isSuperAdmin ? 'true' : 'false');
                localStorage.setItem('rememberUserSession', 'true');
            }
            
            updateUserInterface();
            showNotification('Sesión iniciada correctamente', 'success');
            return { success: true };
        } else {
            showNotification(result.error || 'Credenciales incorrectas', 'error');
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error en login:', error);
        showNotification('Error al iniciar sesión', 'error');
        return { success: false, error: error.message };
    }
}
```

---

## 🔄 ALTERNATIVA: Usar archivo de configuración (si no puedes usar Firebase Auth)

Si por alguna razón no puedes usar Firebase Authentication directamente, puedes usar un archivo de configuración externo:

### **Crear `config/admin-credentials.js`** (NO subir a Git):

```javascript
// config/admin-credentials.js
// ⚠️ ESTE ARCHIVO NO SE SUBE A GIT (.gitignore)

window.ADMIN_CREDENTIALS_CONFIG = {
    superAdmin: {
        email: 'superadmin@ayuntamientocobreros.es',
        password: 'NUEVA_CONTRASEÑA_SEGURA_AQUI',
        name: 'Super Administrador',
        isSuperAdmin: true
    },
    defaultAdmin: {
        email: 'admin@ayuntamientocobreros.es',
        password: 'NUEVA_CONTRASEÑA_SEGURA_AQUI',
        name: 'Administrador Principal',
        isAdmin: true
    }
};
```

### **Actualizar `.gitignore`**:

```
# Credenciales de administradores (NO subir)
config/admin-credentials.js
```

### **Cargar en `index.html`** (ANTES de `script.js`):

```html
<!-- Cargar credenciales (solo existe en el servidor) -->
<script src="config/admin-credentials.js"></script>
<!-- Luego cargar el script principal -->
<script src="js/script.js"></script>
```

### **Usar en `script.js`**:

```javascript
// ✅ Cargar desde configuración externa
const SUPER_ADMIN = window.ADMIN_CREDENTIALS_CONFIG?.superAdmin || null;
const ADMIN_CREDENTIALS = window.ADMIN_CREDENTIALS_CONFIG?.defaultAdmin || null;

// Verificar que existan
if (!SUPER_ADMIN || !ADMIN_CREDENTIALS) {
    console.error('⚠️ Credenciales de administrador no configuradas');
}
```

**Ventajas de este método**:
- ✅ Las credenciales NO están en el código fuente público
- ✅ El archivo `config/admin-credentials.js` solo existe en el servidor
- ✅ NO se sube a Git (está en `.gitignore`)
- ✅ Cada despliegue puede tener credenciales diferentes

**Desventajas**:
- ⚠️ Aún así, si alguien accede al servidor, puede ver el archivo
- ⚠️ No es tan seguro como Firebase Authentication

---

## 📋 CHECKLIST DE MIGRACIÓN

### **Opción A: Firebase Authentication (MÁS SEGURO)**

- [ ] Eliminar `SUPER_ADMIN` y `ADMIN_CREDENTIALS` de `script.js`
- [ ] Crear usuarios en Firebase Authentication
- [ ] Crear documentos de administradores en Firestore
- [ ] Actualizar función `processUserLogin()` para usar Firebase Auth
- [ ] Probar login con nuevas credenciales
- [ ] Eliminar cualquier referencia a credenciales hardcodeadas

### **Opción B: Archivo de configuración externo**

- [ ] Crear `config/admin-credentials.js` con nuevas contraseñas
- [ ] Añadir `config/admin-credentials.js` a `.gitignore`
- [ ] Eliminar `SUPER_ADMIN` y `ADMIN_CREDENTIALS` de `script.js`
- [ ] Cargar `config/admin-credentials.js` en `index.html`
- [ ] Actualizar código para usar `window.ADMIN_CREDENTIALS_CONFIG`
- [ ] Verificar que el archivo NO se sube a Git
- [ ] Probar login con nuevas credenciales

---

## 🚨 IMPORTANTE

**NO cifres las contraseñas en el código JavaScript**. Es inútil porque:

1. ❌ El código se ejecuta en el navegador (público)
2. ❌ La clave de cifrado también estaría visible
3. ❌ Cualquiera puede copiar y ejecutar el código
4. ❌ Base64 no es cifrado, es solo codificación

**La única solución segura es**:
- ✅ Eliminar credenciales del código fuente
- ✅ Usar Firebase Authentication (recomendado)
- ✅ O usar archivo de configuración externo (NO en Git)

---

## 💡 RECOMENDACIÓN FINAL

**Usa Firebase Authentication** (Opción A). Es la solución más segura porque:

- ✅ Las contraseñas están en el servidor (Firebase)
- ✅ Firebase maneja el cifrado y seguridad
- ✅ No hay credenciales en el código fuente
- ✅ Puedes habilitar 2FA (autenticación de dos factores)
- ✅ Firebase tiene protección contra ataques de fuerza bruta
- ✅ Puedes ver logs de acceso en Firebase Console

---

**¿Necesitas ayuda para implementar alguna de estas soluciones?**


