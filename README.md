# 🏛️ Ayuntamiento de Cobreros - Página Web Municipal

## 📋 Descripción

Página web completa para el Ayuntamiento de Cobreros con todas las funcionalidades necesarias para un ayuntamiento moderno. Incluye gestión de contenido, sistema de usuarios, notificaciones y panel de administración.

## ✨ Características Principales

### 🏛️ Secciones del Ayuntamiento
- **Inicio**: Página principal con acceso rápido a servicios
- **Bando Municipal**: Publicación de normativas y anuncios oficiales
- **Noticias**: Gestión de noticias municipales
- **Cita Previa**: Sistema de solicitud de citas
- **Sede Electrónica**: Trámites online
- **Documentos**: Formularios y normativas descargables
- **Cultura y Ocio**: Eventos y instalaciones municipales

### 👥 Sistema de Usuarios
- ✅ Registro de usuarios con consentimiento GDPR
- ✅ Sistema de notificaciones push y por email
- ✅ Gestión de datos personales según ley vigente
- ✅ Funcionalidad completa sin necesidad de registro

### 🔔 Sistema de Notificaciones
- ✅ Notificaciones push del navegador
- ✅ Notificaciones por correo electrónico
- ✅ Centro de notificaciones con historial
- ✅ Almacenamiento de hasta 5 notificaciones por usuario
- ✅ Diferentes tipos: general, urgente, evento

### ⚙️ Panel de Administración
- ✅ Login seguro para administradores
- ✅ Super administrador oculto (TURISTEAM)
- ✅ Gestión completa de contenido (noticias, bandos, eventos, acceso rápido)
- ✅ Gestión de usuarios registrados
- ✅ Gestión de administradores (crear, editar, eliminar)
- ✅ Sistema de envío de notificaciones
- ✅ Gestión de documentos (subir, editar, eliminar, descargar)
- ✅ Base de datos (exportar/importar datos)
- ✅ Configuración del escudo municipal
- ✅ Historial de notificaciones enviadas

### 📱 Diseño Responsive
- ✅ Adaptado para móviles, tablets y escritorio
- ✅ Navegación intuitiva
- ✅ Diseño moderno y accesible
- ✅ Optimizado para SEO

## 🚀 Instalación y Uso

### Requisitos
- Navegador web moderno
- Servidor web (opcional para desarrollo local)

### Instalación
1. Descargar todos los archivos del proyecto
2. Colocar en el directorio del servidor web
3. Abrir `index.html` en el navegador

### 🔑 Acceso de Administrador
- **Email**: `admin@ayuntamientocobreros.es`
- **Contraseña**: `admin123`

### 🔐 Acceso de Super Administrador (TURISTEAM)
- **Email**: `amco@gmx.es`
- **Contraseña**: `533712`
- **Características**: Oculto del público, acceso completo al sistema

## 📁 Estructura del Proyecto

```
ayuntamiento-cobreros/
├── index.html          # Página principal (478 líneas)
├── css/
│   └── styles.css      # Estilos CSS (1087 líneas)
├── js/
│   └── script.js       # Funcionalidad JavaScript (892 líneas)
├── images/             # Imágenes del sitio
└── README.md          # Este archivo
```

## 🎯 Funcionalidades Técnicas

### Almacenamiento Local
- Utiliza localStorage para persistencia de datos
- Gestión de usuarios, notificaciones y contenido
- Datos se mantienen entre sesiones

### Notificaciones Push
- Solicita permisos del navegador
- Envía notificaciones nativas
- Sistema de badges para notificaciones no leídas

### Formularios
- Validación en tiempo real
- Envío de citas previas
- Registro de usuarios con validación
- Consentimiento GDPR integrado

### Panel de Administración
- Gestión CRUD completa
- Tabs organizados por funcionalidad
- Editor de contenido integrado
- Subida de archivos (escudo municipal)

## 🎨 Personalización

### Colores
Los colores se pueden modificar en las variables CSS del archivo `styles.css`:

```css
:root {
    --primary-color: #1e40af;
    --secondary-color: #3b82f6;
    --accent-color: #f59e0b;
    /* ... más variables */
}
```

### Contenido
- Editar noticias y bandos desde el panel de administración
- Subir nuevo escudo municipal
- Personalizar información de contacto en el footer

### Notificaciones
- Configurar tipos de notificaciones
- Personalizar mensajes por defecto
- Ajustar límite de notificaciones almacenadas

## ⚖️ Cumplimiento Legal

### GDPR/LOPD
- ✅ Consentimiento explícito para tratamiento de datos
- ✅ Información clara sobre uso de datos
- ✅ Derecho al olvido implementado
- ✅ Política de privacidad integrada

### Accesibilidad
- ✅ Navegación por teclado
- ✅ Contraste adecuado
- ✅ Textos alternativos en imágenes
- ✅ Estructura semántica HTML

## 🔧 Soporte y Mantenimiento

### Backup de Datos
- Los datos se almacenan en localStorage
- Recomendado hacer backup periódico
- Exportar datos de usuarios y notificaciones

### Actualizaciones
- Sistema modular fácil de actualizar
- Separación clara entre lógica y presentación
- Código documentado y comentado

## 📞 Contacto

Para soporte técnico o consultas sobre la implementación:
- **Email**: info@ayuntamientocobreros.es
- **Teléfono**: 987 123 456

---

**Desarrollado para el Ayuntamiento de Cobreros**  
*Sistema web municipal moderno y funcional*

## 🎉 ¡Listo para usar!

La página web está completamente funcional. Solo necesitas abrir `index.html` en tu navegador y comenzar a usar todas las funcionalidades.

### 🚀 Cómo empezar:
1. Abre `index.html` en tu navegador
2. Prueba el registro de usuarios
3. Accede como administrador con las credenciales
4. **Botón verde de acceso admin** en la esquina superior derecha
5. Explora todas las funcionalidades
6. Personaliza el contenido según tus necesidades

### 🎯 Características Destacadas:
- **Escudo municipal** personalizado (160x160px)
- **Botón de acceso admin** verde en esquina superior derecha
- **Super administrador oculto** para control total del sistema
- **Gestión completa de contenido** desde el panel de administración
- **Sistema de notificaciones** solo para usuarios registrados con consentimiento

¡Disfruta de tu nueva página web municipal! 🎊