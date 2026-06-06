# 🔐 Implementación de Firebase Authentication para Administradores

## ✅ Estado Actual

**¡Buenas noticias!** El código ya está implementado para usar Firebase Authentication. La función `authenticateAdmin()` en `js/script.js` (líneas 421-523) ya está configurada correctamente.

**Lo que ya está hecho:**
- ✅ Función `authenticateAdmin()` implementada
- ✅ Integración con Firebase Authentication
- ✅ Verificación de permisos en Firestore
- ✅ Manejo de errores completo
- ✅ Función `handleAdminLogin()` actualizada para usar Firebase Auth

**Lo que falta:**
- ⚠️ Crear usuarios administradores en Firebase Authentication
- ⚠️ Crear documentos de administradores en Firestore

---

## 📋 PASO 1: Crear Usuarios Administradores en Firebase Authentication

### 1.1. Acceder a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **turisteam-80f1b** (o el proyecto correspondiente)
3. En el menú lateral, haz clic en **Authentication**

### 1.2. Habilitar Email/Password (si no está habilitado)

1. En la pestaña **Sign-in method**
2. Busca **Email/Password**
3. Si está deshabilitado, haz clic en **Email/Password** y luego en **Enable**
4. Guarda los cambios

### 1.3. Crear Usuario Super Administrador

1. Ve a la pestaña **Users**
2. Haz clic en **Add user**
3. Ingresa:
   - **Email**: `superadmin@ayuntamientocobreros.es` (o el email que prefieras)
   - **Password**: Crea una contraseña segura (mínimo 8 caracteres)
4. Haz clic en **Add user**
5. **⚠️ IMPORTANTE**: Guarda esta contraseña en un lugar seguro

### 1.4. Crear Usuario Administrador Principal

1. Haz clic en **Add user** nuevamente
2. Ingresa:
   - **Email**: `admin@ayuntamientocobreros.es` (o el email que prefieras)
   - **Password**: Crea una contraseña segura (mínimo 8 caracteres)
3. Haz clic en **Add user**
4. **⚠️ IMPORTANTE**: Guarda esta contraseña en un lugar seguro

---

## 📋 PASO 2: Crear Documentos de Administradores en Firestore

### 2.1. Acceder a Firestore

1. En Firebase Console, haz clic en **Firestore Database** en el menú lateral
2. Si es la primera vez, haz clic en **Create database**
3. Selecciona modo **Production** o **Test** (según prefieras)
4. Selecciona la ubicación (ej: `europe-west`)

### 2.2. Obtener el UID del Super Administrador

1. Ve a **Authentication** → **Users**
2. Busca el usuario `superadmin@ayuntamientocobreros.es`
3. Haz clic en el usuario para ver sus detalles
4. **Copia el UID** (es un string largo, ej: `abc123def456...`)

### 2.3. Crear Documento del Super Administrador en Firestore

1. En **Firestore Database**, haz clic en **Start collection**
2. Nombre de la colección: `administrators`
3. Document ID: **Pega el UID del super administrador** (el que copiaste antes)
4. Agrega los siguientes campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `email` | string | `superadmin@ayuntamientocobreros.es` |
| `name` | string | `Super Administrador` |
| `isSuperAdmin` | boolean | `true` |
| `isAdmin` | boolean | `true` |
| `isActive` | boolean | `true` |
| `isHidden` | boolean | `true` |
| `team` | string | `TURISTEAM` |
| `createdAt` | timestamp | (fecha actual) |

5. Haz clic en **Save**

### 2.4. Obtener el UID del Administrador Principal

1. Ve a **Authentication** → **Users**
2. Busca el usuario `admin@ayuntamientocobreros.es`
3. Haz clic en el usuario para ver sus detalles
4. **Copia el UID**

### 2.5. Crear Documento del Administrador Principal en Firestore

1. En la colección `administrators`, haz clic en **Add document**
2. Document ID: **Pega el UID del administrador principal**
3. Agrega los siguientes campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `email` | string | `admin@ayuntamientocobreros.es` |
| `name` | string | `Administrador Principal` |
| `isSuperAdmin` | boolean | `false` |
| `isAdmin` | boolean | `true` |
| `isActive` | boolean | `true` |
| `isHidden` | boolean | `true` |
| `createdAt` | timestamp | (fecha actual) |

4. Haz clic en **Save**

---

## 📋 PASO 3: Configurar Reglas de Seguridad de Firestore

### 3.1. Acceder a Reglas de Firestore

1. En **Firestore Database**, ve a la pestaña **Rules**

### 3.2. Configurar Reglas para Administradores

Reemplaza las reglas actuales con estas (ajusta según tus necesidades):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para la colección de administradores
    match /administrators/{adminId} {
      // Solo los administradores pueden leer su propio documento
      allow read: if request.auth != null && request.auth.uid == adminId;
      
      // Solo los super administradores pueden escribir
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/administrators/$(request.auth.uid)).data.isSuperAdmin == true;
    }
    
    // Reglas para otras colecciones (ajusta según necesites)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ IMPORTANTE**: Estas reglas son básicas. Ajusta según tus necesidades de seguridad.

---

## 📋 PASO 4: Probar el Login

### 4.1. Probar Login de Super Administrador

1. Abre la aplicación en el navegador
2. Haz clic en el botón **ADMIN** (esquina superior izquierda)
3. Ingresa:
   - **Email**: `superadmin@ayuntamientocobreros.es`
   - **Password**: (la contraseña que creaste)
4. Haz clic en **Iniciar Sesión**
5. Deberías ver: "Sesión de administrador iniciada - Ayuntamiento de Cobreros"

### 4.2. Verificar Permisos

1. Deberías ver el botón **Panel Admin** visible
2. Al hacer clic, deberías ver todas las pestañas, incluyendo la de **Administradores**

### 4.3. Probar Login de Administrador Principal

1. Cierra sesión
2. Haz clic en **ADMIN** nuevamente
3. Ingresa:
   - **Email**: `admin@ayuntamientocobreros.es`
   - **Password**: (la contraseña que creaste)
4. Haz clic en **Iniciar Sesión**
5. Deberías ver el panel de administración, pero **NO** deberías ver la pestaña de **Administradores** (solo los super admins la ven)

---

## 🔒 PASO 5: Eliminar Cualquier Credencial Hardcodeada (Si Existe)

### 5.1. Buscar Credenciales Hardcodeadas

Busca en `js/script.js` cualquier referencia a:
- `SUPER_ADMIN`
- `ADMIN_CREDENTIALS`
- `atob('...')` (decodificación Base64)

### 5.2. Eliminar si Existen

Si encuentras algo como esto:

```javascript
// ❌ ELIMINAR ESTO
const SUPER_ADMIN = {
    email: atob('ZWRpdG9ydHVyaXNAZ21haWwuY29t'),
    password: atob('MjkxMDIwMTI='),
    // ...
};
```

**Elimínalo completamente**. Ya no es necesario porque usamos Firebase Authentication.

---

## ✅ Checklist Final

- [ ] Usuarios creados en Firebase Authentication
- [ ] Documentos de administradores creados en Firestore
- [ ] Reglas de seguridad de Firestore configuradas
- [ ] Login de super administrador probado y funcionando
- [ ] Login de administrador principal probado y funcionando
- [ ] Permisos verificados (super admin ve pestaña de administradores, admin normal no)
- [ ] Cualquier credencial hardcodeada eliminada del código

---

## 🆘 Solución de Problemas

### Error: "El sistema de autenticación no está disponible"

**Causa**: Firebase no está inicializado correctamente.

**Solución**:
1. Verifica que Firebase esté cargado en `index.html`
2. Verifica que `window.firebaseAuth` y `window.firebase` estén disponibles
3. Revisa la consola del navegador para errores

### Error: "No tiene permisos de administrador"

**Causa**: El usuario existe en Firebase Authentication pero no tiene documento en Firestore.

**Solución**:
1. Verifica que el documento exista en la colección `administrators`
2. Verifica que el Document ID sea el UID del usuario
3. Verifica que el campo `isAdmin` o `isSuperAdmin` sea `true`

### Error: "Su cuenta de administrador está desactivada"

**Causa**: El campo `isActive` en Firestore es `false`.

**Solución**:
1. Ve a Firestore → `administrators` → [UID del usuario]
2. Cambia `isActive` a `true`
3. Guarda los cambios

---

## 📝 Notas Importantes

1. **Las contraseñas están en Firebase** (servidor), no en el código fuente. Esto es seguro.
2. **Los permisos se verifican en Firestore**, no en el código. Esto permite cambiar permisos sin modificar código.
3. **El UID de Firebase es único** y se usa como Document ID en Firestore para vincular el usuario con sus permisos.
4. **Los super administradores** pueden crear otros administradores desde el panel.
5. **Los administradores normales** no pueden ver ni modificar otros administradores.

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tu sistema de autenticación estará completamente seguro y funcionando con Firebase Authentication.

**¿Necesitas ayuda?** Revisa la consola del navegador para ver errores específicos.


