# Sistema de Persistencia y Gestión desde Admin

**Fecha:** Noviembre 2025

## ✅ Implementado

### 1. Gestor de Contenido desde Admin
- **Archivo:** `js/admin-content-manager.js`
- **Funcionalidad:** Gestiona todo el contenido desde el panel de administración con persistencia en Firestore

### 2. Nuevas Pestañas en Panel Admin
Se han agregado las siguientes pestañas al panel de administración:

- **Banners** - Gestión de banners rotativos
- **Sobre el Ayuntamiento** - Historia, organigrama, pleno, comisiones
- **Timeline** - Timeline de eventos
- **Calendario** - Calendario de eventos con visibilidad
- **Traducciones** - Gestión de traducciones multiidioma
- **Transparencia** - Presupuestos, contratos, etc.
- **Servicios Municipales** - Servicios sociales, educación, deportes, etc.

## 🔄 Flujo de Persistencia

### 1. Guardado desde Admin
1. Admin completa formulario en panel de administración
2. Se guarda en Firestore (colecciones específicas)
3. Se muestra notificación de éxito
4. Se recarga el contenido automáticamente

### 2. Carga en Página Principal
1. Al cargar la página, `AdminContentManager.loadAllContent()` se ejecuta
2. Carga datos desde Firestore
3. Renderiza el contenido en las secciones correspondientes
4. Todo es persistente (no se borra con refresco)

### 3. Colecciones Firestore

#### `banners`
```javascript
{
  titulo: string,
  descripcion: string,
  imagen: string (URL),
  enlace: string,
  botonTexto: string,
  orden: number,
  activo: boolean,
  creado: timestamp,
  creadoPor: string (adminId),
  actualizado: timestamp,
  actualizadoPor: string (adminId)
}
```

#### `config/aboutSection`
```javascript
{
  historia: string (HTML),
  organigrama: array,
  pleno: {
    alcalde: string,
    concejales: number,
    actas: array
  },
  comisiones: array,
  actualizado: timestamp
}
```

#### `timelineEvents`
```javascript
{
  titulo: string,
  descripcion: string,
  fecha: string (ISO date),
  activo: boolean,
  creado: timestamp
}
```

#### `calendarEvents`
```javascript
{
  titulo: string,
  descripcion: string,
  fecha: string (ISO datetime),
  localidad: string,
  visible: boolean,
  creado: timestamp
}
```

#### `translations`
```javascript
{
  language: string ('es'|'gl'|'en'),
  translations: object,
  actualizado: timestamp
}
```

#### `config/transparency`
```javascript
{
  presupuestos: array,
  contratos: array,
  subvenciones: array,
  retribuciones: array,
  indicadores: object,
  actualizado: timestamp
}
```

#### `config/services`
```javascript
{
  sociales: string (HTML),
  educacion: string (HTML),
  deportes: string (HTML),
  medioAmbiente: string (HTML),
  urbanismo: string (HTML),
  obras: string (HTML),
  actualizado: timestamp
}
```

## 📋 Funcionalidades por Pestaña

### Banners
- ✅ Crear/editar banners
- ✅ Subir imágenes
- ✅ Configurar orden
- ✅ Activar/desactivar
- ✅ Lista de banners existentes
- ✅ Eliminar banners

### Sobre el Ayuntamiento
- ✅ Historia (editor WYSIWYG)
- ✅ Organigrama (cargos, nombres, emails)
- ✅ Pleno municipal (alcalde, concejales, actas)
- ✅ Comisiones (nombre, descripción, miembros)

### Timeline
- ✅ Crear eventos en timeline
- ✅ Fecha, título, descripción
- ✅ Activar/desactivar
- ✅ Lista de eventos

### Calendario
- ✅ Crear eventos de calendario
- ✅ Fecha y hora
- ✅ Localidad
- ✅ **Checkbox de visibilidad** (oculto/visible)
- ✅ Lista de eventos con estado de visibilidad

### Traducciones
- ✅ Seleccionar idioma (ES/GL/EN)
- ✅ Editar traducciones
- ✅ Guardar cambios
- ✅ Carga automática en página principal

### Transparencia
- ✅ Presupuestos (año, presupuesto, ejecutado, URL)
- ✅ Contratos (número, empresa, importe, fecha)
- ✅ Subvenciones (estructura preparada)
- ✅ Retribuciones (estructura preparada)
- ✅ Indicadores (estructura preparada)

### Servicios Municipales
- ✅ Servicios Sociales (editor WYSIWYG)
- ✅ Educación (editor WYSIWYG)
- ✅ Deportes (editor WYSIWYG)
- ✅ Medio Ambiente (estructura preparada)
- ✅ Urbanismo (estructura preparada)
- ✅ Obras y Servicios (estructura preparada)

## 🔄 Sincronización Automática

### Al Guardar
1. Se guarda en Firestore
2. Se recarga el contenido automáticamente
3. Se actualiza la vista en la página principal
4. No requiere refrescar la página

### Al Cargar Página
1. `AdminContentManager.init()` se ejecuta
2. `loadAllContent()` carga todo desde Firestore
3. Se renderiza en las secciones correspondientes
4. Todo es persistente

## ✅ Garantías de Persistencia

1. **Firestore como fuente de verdad** - Todo se guarda en Firestore
2. **Carga automática** - Se carga al iniciar la página
3. **Sin pérdida de datos** - Los datos no se borran con refresco
4. **Sincronización** - Cambios desde admin se reflejan inmediatamente
5. **Backup automático** - Firestore tiene backup automático

## 🚀 Próximos Pasos

1. Agregar secciones HTML en la página principal para mostrar el contenido
2. Implementar widgets adicionales (clima, etc.)
3. Mejorar UI de las pestañas admin
4. Agregar validaciones adicionales
5. Implementar preview antes de guardar

---

**Estado:** ✅ Sistema de persistencia implementado y funcional






