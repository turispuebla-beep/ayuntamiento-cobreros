# 📱 App de Notificaciones - Ayuntamiento de Cobreros

## Descripción
App móvil específica para recibir notificaciones del Ayuntamiento de Cobreros. Diseñada para ser simple, rápida y enfocada únicamente en notificaciones.

## Características

### 🔔 Notificaciones
- **Recepción automática** de notificaciones desde la web del ayuntamiento
- **Notificaciones push** con el escudo de Cobreros
- **Visualización clara** de título, mensaje y fecha
- **Marcado de leídas** automático al abrir

### 📄 Documentos
- **Soporte para PDF y JPG** adjuntos
- **Indicador visual** cuando hay documento adjunto
- **Apertura directa** del documento al tocar

### 👨‍💼 Panel de Administración
- **Botón discreto** (+) en la esquina inferior derecha
- **Acceso móvil** para administradores
- **Envío de notificaciones** desde el móvil
- **Adjuntar documentos** (PDF/JPG)
- **Selección de pueblos objetivo** para notificaciones específicas
- **Tipos de notificación**: General, Bando, Noticia, Evento, Urgente

### 🏘️ Filtrado por Pueblos
- **Selector múltiple** de pueblos de interés
- **Notificaciones generales** siempre visibles
- **Filtrado automático** según pueblos seleccionados
- **Persistencia** de selección en localStorage

### 🎨 Diseño
- **Logo de Cobreros prominente** como distintivo principal
- **Interfaz minimalista** enfocada en notificaciones
- **Escudo oficial** en header, estado vacío y panel admin
- **Colores distintivos** (#2c3e50) para diferenciarse
- **Responsive** para todos los dispositivos móviles
- **Identidad visual fuerte** que destaca entre otras apps

## Instalación

### Para Usuarios
1. Abrir en navegador móvil: `https://tu-dominio.com/notification-app/`
2. Agregar a pantalla de inicio (PWA)
3. Permitir notificaciones cuando se solicite

### Para Administradores
1. Abrir la app
2. Tocar el botón de envío (+) en la esquina inferior derecha
3. Iniciar sesión con credenciales de admin
4. Seleccionar pueblos objetivo (opcional)
5. Enviar notificaciones desde el móvil

## Configuración

### Credenciales de Admin
- **Email**: `admin@cobreros.es`
- **Contraseña**: `admin123`

### Firebase
La app se conecta a la misma base de datos Firebase que la web principal:
- **Colección**: `notifications`
- **Notificaciones push**: Firebase Cloud Messaging

## Funcionamiento

### Flujo de Notificaciones
1. **Web del Ayuntamiento** → Crea bando/noticia
2. **Sistema automático** → Guarda en Firestore con pueblos objetivo
3. **App móvil** → Recibe notificación push
4. **Usuario** → Ve notificación con escudo (filtrada por pueblos)
5. **Al tocar** → Abre detalles y marca como leída

### Filtrado por Pueblos
- **Notificaciones generales**: Siempre visibles para todos
- **Notificaciones específicas**: Solo visibles para pueblos seleccionados
- **Selección múltiple**: Usuario puede elegir varios pueblos de interés
- **Persistencia**: La selección se guarda automáticamente

### Tipos de Notificación
- 📄 **Bando Municipal**: Bandos oficiales
- 📢 **Noticia**: Noticias del ayuntamiento  
- 🎭 **Evento**: Eventos culturales/deportivos
- 🚨 **Urgente**: Comunicaciones urgentes
- 📋 **General**: Otras comunicaciones

## Archivos

- `index.html` - Interfaz principal
- `app.js` - Lógica de la aplicación
- `manifest.json` - Configuración PWA
- `sw.js` - Service Worker para notificaciones
- `README.md` - Esta documentación

## Integración con Web Principal

La app se sincroniza automáticamente con la web del ayuntamiento:

1. **Bandos**: Se envían automáticamente al crear
2. **Noticias**: Se envían automáticamente al publicar
3. **Eventos**: Se pueden enviar desde el panel admin
4. **Manuales**: Se pueden enviar desde la app móvil

## Soporte

Para soporte técnico o consultas sobre la app de notificaciones, contactar con el equipo de desarrollo del ayuntamiento.

---
**Ayuntamiento de Cobreros** - Sistema de Notificaciones Móviles

## Descripción
App móvil específica para recibir notificaciones del Ayuntamiento de Cobreros. Diseñada para ser simple, rápida y enfocada únicamente en notificaciones.

## Características

### 🔔 Notificaciones
- **Recepción automática** de notificaciones desde la web del ayuntamiento
- **Notificaciones push** con el escudo de Cobreros
- **Visualización clara** de título, mensaje y fecha
- **Marcado de leídas** automático al abrir

### 📄 Documentos
- **Soporte para PDF y JPG** adjuntos
- **Indicador visual** cuando hay documento adjunto
- **Apertura directa** del documento al tocar

### 👨‍💼 Panel de Administración
- **Botón discreto** (+) en la esquina inferior derecha
- **Acceso móvil** para administradores
- **Envío de notificaciones** desde el móvil
- **Adjuntar documentos** (PDF/JPG)
- **Selección de pueblos objetivo** para notificaciones específicas
- **Tipos de notificación**: General, Bando, Noticia, Evento, Urgente

### 🏘️ Filtrado por Pueblos
- **Selector múltiple** de pueblos de interés
- **Notificaciones generales** siempre visibles
- **Filtrado automático** según pueblos seleccionados
- **Persistencia** de selección en localStorage

### 🎨 Diseño
- **Logo de Cobreros prominente** como distintivo principal
- **Interfaz minimalista** enfocada en notificaciones
- **Escudo oficial** en header, estado vacío y panel admin
- **Colores distintivos** (#2c3e50) para diferenciarse
- **Responsive** para todos los dispositivos móviles
- **Identidad visual fuerte** que destaca entre otras apps

## Instalación

### Para Usuarios
1. Abrir en navegador móvil: `https://tu-dominio.com/notification-app/`
2. Agregar a pantalla de inicio (PWA)
3. Permitir notificaciones cuando se solicite

### Para Administradores
1. Abrir la app
2. Tocar el botón de envío (+) en la esquina inferior derecha
3. Iniciar sesión con credenciales de admin
4. Seleccionar pueblos objetivo (opcional)
5. Enviar notificaciones desde el móvil

## Configuración

### Credenciales de Admin
- **Email**: `admin@cobreros.es`
- **Contraseña**: `admin123`

### Firebase
La app se conecta a la misma base de datos Firebase que la web principal:
- **Colección**: `notifications`
- **Notificaciones push**: Firebase Cloud Messaging

## Funcionamiento

### Flujo de Notificaciones
1. **Web del Ayuntamiento** → Crea bando/noticia
2. **Sistema automático** → Guarda en Firestore con pueblos objetivo
3. **App móvil** → Recibe notificación push
4. **Usuario** → Ve notificación con escudo (filtrada por pueblos)
5. **Al tocar** → Abre detalles y marca como leída

### Filtrado por Pueblos
- **Notificaciones generales**: Siempre visibles para todos
- **Notificaciones específicas**: Solo visibles para pueblos seleccionados
- **Selección múltiple**: Usuario puede elegir varios pueblos de interés
- **Persistencia**: La selección se guarda automáticamente

### Tipos de Notificación
- 📄 **Bando Municipal**: Bandos oficiales
- 📢 **Noticia**: Noticias del ayuntamiento  
- 🎭 **Evento**: Eventos culturales/deportivos
- 🚨 **Urgente**: Comunicaciones urgentes
- 📋 **General**: Otras comunicaciones

## Archivos

- `index.html` - Interfaz principal
- `app.js` - Lógica de la aplicación
- `manifest.json` - Configuración PWA
- `sw.js` - Service Worker para notificaciones
- `README.md` - Esta documentación

## Integración con Web Principal

La app se sincroniza automáticamente con la web del ayuntamiento:

1. **Bandos**: Se envían automáticamente al crear
2. **Noticias**: Se envían automáticamente al publicar
3. **Eventos**: Se pueden enviar desde el panel admin
4. **Manuales**: Se pueden enviar desde la app móvil

## Soporte

Para soporte técnico o consultas sobre la app de notificaciones, contactar con el equipo de desarrollo del ayuntamiento.

---
**Ayuntamiento de Cobreros** - Sistema de Notificaciones Móviles