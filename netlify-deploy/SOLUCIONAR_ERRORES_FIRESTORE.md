# 🔧 Solucionar Errores de Permisos en Firestore

## ✅ Lo que SÍ Funciona

- ✅ **Firebase inicializado correctamente**
- ✅ **reCAPTCHA funcionando** (`reCAPTCHA disponible: true`)
- ✅ **Quill cargado correctamente**
- ✅ **Configuración de citas previas funcionando**
- ✅ **Service Worker registrado**
- ✅ **Contenido de Cobreros cargado**

## ❌ Errores que Necesitan Solución

### 1. **Errores de Permisos de Firestore**

```
Error cargando usuarios desde Firestore: Missing or insufficient permissions
Error cargando notificaciones recibidas: Missing or insufficient permissions
Error guardando configuración consultorio en Firestore: Missing or insufficient permissions
Error guardando configuración servicios en Firestore: Missing or insufficient permissions
```

**Causa**: Las reglas de seguridad de Firestore no permiten leer/escribir en estas colecciones.

**Solución**: Configurar reglas de seguridad en Firestore.

### 2. **Permiso de Notificaciones Bloqueado**

```
Notifications permission has been blocked as the user has ignored the permission prompt several times
```

**Causa**: El usuario ha ignorado el permiso de notificaciones varias veces.

**Solución**: El usuario debe resetear el permiso en la configuración del navegador.

---

## 🔧 SOLUCIÓN 1: Configurar Reglas de Firestore

### Paso 1: Acceder a Firestore Rules

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **turisteam-80f1b**
3. Ve a **Firestore Database** → **Rules**

### Paso 2: Configurar Reglas de Seguridad

Reemplaza las reglas actuales con estas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== COLECCIÓN: users =====
    match /users/{userId} {
      // Cualquier usuario autenticado puede leer su propio documento
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Cualquier usuario autenticado puede crear su propio documento
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Cualquier usuario autenticado puede actualizar su propio documento
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // Solo administradores pueden leer todos los usuarios
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Permitir listar usuarios (solo para administradores)
    match /users/{document=**} {
      allow list: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // ===== COLECCIÓN: notifications =====
    match /users/{userId}/notifications/{notificationId} {
      // Usuarios pueden leer sus propias notificaciones
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Solo administradores pueden crear notificaciones
      allow create: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // ===== COLECCIÓN: config =====
    match /config/{configId} {
      // Cualquiera puede leer configuración pública
      allow read: if true;
      
      // Solo administradores pueden escribir configuración
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // ===== COLECCIÓN: admins =====
    match /admins/{adminId} {
      // Solo los administradores pueden leer su propio documento
      allow read: if request.auth != null && request.auth.uid == adminId;
      
      // Solo los super administradores pueden escribir
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isSuperAdmin == true;
    }
    
    // ===== OTRAS COLECCIONES =====
    // Permitir acceso a otras colecciones según necesites
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Paso 3: Publicar las Reglas

1. Haz clic en **Publish** (Publicar)
2. Espera a que se publiquen (puede tardar unos segundos)
3. Verifica que no haya errores de sintaxis

### Paso 4: Verificar

1. Recarga tu sitio web
2. Abre la consola del navegador (F12)
3. Los errores de permisos deberían desaparecer

---

## 🔧 SOLUCIÓN 2: Resetear Permiso de Notificaciones

### Para Chrome/Edge:

1. Haz clic en el **ícono de candado** 🔒 junto a la URL
2. Ve a **Configuración del sitio** → **Notificaciones**
3. Cambia de **Bloquear** a **Preguntar** o **Permitir**
4. Recarga la página

### Para Firefox:

1. Haz clic en el **ícono de candado** 🔒 junto a la URL
2. Ve a **Más información** → **Permisos**
3. Busca **Notificaciones** y cambia a **Preguntar**
4. Recarga la página

---

## 📋 Checklist de Verificación

- [ ] Reglas de Firestore configuradas y publicadas
- [ ] Errores de permisos desaparecieron de la consola
- [ ] Usuarios se pueden cargar desde Firestore
- [ ] Notificaciones se pueden cargar
- [ ] Configuración se puede guardar
- [ ] Permiso de notificaciones reseteado (opcional)

---

## ⚠️ Notas Importantes

### Seguridad de las Reglas

Las reglas que proporcioné son **básicas y seguras**:
- ✅ Los usuarios solo pueden leer/escribir sus propios datos
- ✅ Solo administradores pueden leer todos los usuarios
- ✅ Solo administradores pueden crear notificaciones
- ✅ Solo super administradores pueden modificar administradores

### Si Necesitas Más Seguridad

Puedes ajustar las reglas según tus necesidades:
- Agregar validación de campos
- Agregar límites de tamaño
- Agregar validación de datos

---

## 🎯 Resumen

**Estado actual:**
- ✅ reCAPTCHA funciona
- ✅ Firebase funciona
- ❌ Firestore necesita reglas de seguridad
- ⚠️ Permiso de notificaciones bloqueado (opcional)

**Acción requerida:**
1. **Configurar reglas de Firestore** (obligatorio)
2. **Resetear permiso de notificaciones** (opcional, solo si quieres probar notificaciones)

---

**¿Necesitas ayuda para configurar las reglas de Firestore?**

