# Documentación integral de APIs públicas – Ayuntamiento de Cobreros

## 1. Contexto y elección del repositorio
Elegí este repositorio porque concentra toda la lógica pública disponible del ecosistema del Ayuntamiento de Cobreros (web PWA, configuración compartida, service worker y app Android). Documentarlo garantiza que cualquier equipo pueda reutilizar o auditar sus APIs sin depender de conocimiento tácito.

## 2. Arquitectura general
| Subsistema | Ubicación | Descripción |
| --- | --- | --- |
| Web PWA + panel admin | `index.html`, `css/`, `js/script.js`, `images/`, `manifest.json` | Frontend completo con formularios, paneles, notificaciones, cultura/ocio y servicios. |
| Configuración global | `config.js` | Parámetros de ayuntamiento, notificaciones, citas y apariencia. |
| Service Worker | `sw.js` | Cacheo offline y recepción de notificaciones push. |
| Documentación Netlify / PWA | `NETLIFY-DEPLOYMENT.md`, `PWA-README.md`, `_redirects`, `sw.js` | Guías de despliegue y comportamiento PWA. |
| APK Android nativa | `android-app/` | App nativa sincronizada con Firestore/FCM. |

## 3. Convenciones y estado compartido (web)
- Estado global en `js/script.js`: `currentUser`, `isAdmin`, `isSuperAdmin`, `notifications`, `users`, `news`, `bandos`, `administrators`, `documents`, `events`, `quickAccess`, `appointmentsEnabled`, `appointments`, `publicNotifications`, `culturaOcioConfig`, `telefonosInteresConfig`, `seccionesConfig`, `consultorioConfig`, `servicios` y caches auxiliares (`genericModalCallback`, etc.).
- Persistencia: `localStorage` para datos simulados + sincronización selectiva con Firestore (`users`, `notifications`).
- Formularios HTML referencian funciones globales por atributo `onsubmit` o listeners registrados en `setupEventListeners()`.
- Doble definición: `loadNewsList`, `loadBandoList`, `loadUsersList`, `loadAdminsList`, `openNewsEditor`, `openBandoEditor`, `editNews`, `deleteNews`, `editBando`, `deleteBando`, `downloadAttachment` aparecen dos veces. El motor JS conserva **la última definición**; se documenta la intención de cada una para evitar efectos laterales.

## 4. Configuración (`config.js`)
| Clave | Campos destacados | Uso |
| --- | --- | --- |
| `CONFIG.municipality` | `name`, `mayor`, `address`, `phone`, `email`, `website` | Mostrar datos institucionales en web/PWA. |
| `CONFIG.schedule` | `weekdays`, `weekend` | Texto base para horarios de atención. |
| `CONFIG.notifications` | `maxStored`, `types`, `pushEnabled`, `allowedFileTypes`, `maxFileSize`, `requireUserConsent` | Limita adjuntos, define tipos y banderas para formularios de notificaciones. |
| `CONFIG.services` / `CONFIG.appointmentHours` | Listas de servicios y horarios | Población inicial de selectores en citas previas. |
| `CONFIG.admin` / `CONFIG.superAdmin` | Credenciales por defecto | Se cruzan con `SUPER_ADMIN` en `js/script.js`. |
| `CONFIG.privacy` | `gdprCompliant`, `dataRetentionDays`, `consentRequired` | Mensajería y validaciones de formularios. |
| `CONFIG.ui` | `theme`, `primaryColor`, etc. | Personaliza estilos predefinidos. |
| `CONFIG.appointments` | `enabled`, `emailNotifications` | Cambia el flujo “Cita previa” vs “Se atiende sin cita”. |
| `CONFIG.development` | `debug`, `localStoragePrefix`, `apiEndpoint` | Flags para futuras integraciones. |

**Ejemplo de uso:**
```javascript
const statusText = CONFIG.appointments.enabled ? 'CITA PREVIA' : 'SIN CITA';
```

## 5. APIs web (`js/script.js`)

### 5.1 Inventario resumido por módulo
- **Bootstrap y navegación:** `initializeApp`, `createAdminButton`, `clearAllForms`, `setupEventListeners`, `loadData`, `loadEvents`, `loadQuickAccess`, `loadDocuments`, `loadAdministrators`, `updateContent`, `updateNewsSection`, `updateBandoSection`, `scrollToSection`, `updateActiveNavLink`, `openModal`, `closeModal`, `closeAllModals`, `toggleMobileMenu`, `toggleAppointmentForm`, `closeAppointmentForm`, `switchTab`, `handleLogoUpload`, `renderEventos`, `getCategoryIcon`, `updateCulturaOcioSection`, `loadCulturaEventsList`, `loadCulturaCardsList`, `loadCulturaInstalacionesList`, `addCulturaCard`, `editCulturaCard`, `deleteCulturaCard`, `addCulturaInstalacion`, `editCulturaInstalacion`, `deleteCulturaInstalacion`.
- **Usuarios y autenticación:** `handleLogin`, `handleAdminLogin`, `handleRegister`, `handleCreateAdmin`, `login`, `register`, `logout`, `updateUserInterface`, `updateAdminContent`, `openAdminPanel`, `closeAdminPanel`, `loadUsersList` (x2), `loadAdminsList` (x2), `editUser`, `deleteUser`, `editAdmin`, `deleteAdmin`, `isSuperAdminLoggedIn`, `getSuperAdminInfo`, `createAdminButton`, `openSeccionConfig`, `saveSeccionConfig`, `updateSectionTitles`.
- **Contenido editorial y recursos:** `openNewsEditor` (x2), `openBandoEditor` (x2), `editNews` (x2), `deleteNews` (x2), `editBando` (x2), `deleteBando` (x2), `loadNewsList`, `loadBandoList`, `showNewsDetail`, `showBandoDetail`, `handleDocumentUpload`, `loadDocumentsList`, `downloadDocument`, `editDocument`, `deleteDocument`, `loadQuickAccessList`, `openEventEditor`, `closeEventModal`, `saveEvent`, `editEvent`, `deleteEvent`, `loadEventsList`, `handleDataImport`.
- **Exportación/estadística:** `exportUsers`, `exportAdmins`, `exportDocuments`, `exportNotifications`, `exportNews`, `exportBandos`, `exportEvents`, `exportCulturaOcio`, `exportQuickAccess`, `exportAllData`, `exportTelefonosInteres`, `showUserStats`, `loadSystemStats`, `actualizarEstadisticasNotificaciones`.
- **Notificaciones (envío, historial y recepción):** `handleNotification`, `sendNotificationToUsers`, `loadNotifications`, `loadNotificationsHistory`, `updateNotificationCenter`, `showNotificationDetail`, `toggleNotificationCenter`, `markAllAsRead`, `showNotification`, `setupNotificationForm`, `enviarNotificacionPushConLocalidades`, `enviarNotificacionPush`, `enviarNotificacionCita`, `enviarNotificacionEvento`, `enviarNotificacionBando`, `enviarNotificacionEmergencia`, `enviarNotificacionDesdeFormulario`, `limpiarFormularioNotificacion`, `abrirModalNotificacion`, `toggleLocalidadesSelection`, `seleccionarTodasLocalidades`, `deseleccionarTodasLocalidades`, `enviarNotificacionPersonalizada`, `setupNotificationReception`, `handleReceivedNotification`, `showWebNotification`, `loadReceivedNotifications`, `displayReceivedNotifications`, `toggleNotificationsView`, `refreshReceivedNotifications`, `getTypeIcon`, `formatNotificationTime`, `markNotificationAsRead`, `downloadAttachment` (firmas duplicadas), `showNotificationDetail`, `downloadAttachment` (versión attachmentUrl), `refreshPublicNotifications`.
- **Centro público y alertas:** `loadPublicNotifications`, `savePublicNotifications`, `updatePublicNotificationsScroll`, `loadPublicNotificationsList`, `openNotificationEditor`, `closePublicNotificationModal`, `savePublicNotification`, `editPublicNotification`, `toggleNotificationStatus`, `deletePublicNotification`, `setupPublicNotificationModal`, `loadMunicipalAlerts`, `createMunicipalAlert`, `updateMunicipalNotificationBadge`, `playAlertSound`, `markAlertAsRead`, `clearAllAlerts`, `loadMunicipalAlertsList`, `viewAppointmentFromAlert`, `deleteAlert`.
- **Cultura y ocio configurable:** `openCulturaOcioManager`, `closeCulturaOcioModal`, `switchCulturaTab`, `loadCulturaOcioConfig`, `saveCulturaOcio`, `loadCulturaTarjetasList`, `addCulturaTarjeta`, `editCulturaTarjeta`, `deleteCulturaTarjeta`, `editCulturaTarjetaElementos`, `addCulturaTarjetaElemento`, `showCulturaTarjetaElementos`, `editCulturaTarjetaElemento`, `deleteCulturaTarjetaElemento`, `closeTarjetaConfigModal`, `closeElementoModal`, `saveTarjetaConfig`, `loadTarjetaElementosList`, `openElementoEditor`, `editElemento`, `deleteElemento`, `saveElemento`, `toggleEnlaceGroup`.
- **Citas previas y GDPR:** `handleAppointment`, `loadAppointmentSettings`, `updateAppointmentUI`, `updateAppointmentMode`, `validateDNI`, `sendConfirmationEmail`, `sendAdminAlert`, `showGDPRModal`, `closeGDPRModal`, `setupGDPRModal`, `loadAppointments`, `saveAppointments`, `loadAppointmentsList`, `loadAppointmentStats`, `getServiceName`, `getStatusText`, `formatDate`, `formatDateTime`, `updateAppointmentStatus`, `deleteAppointment`, `viewAppointmentDetails`, `filterAppointments`, `refreshAppointments`, `createTestAppointment`, `editAppointment`, `closeEditAppointmentModal`, `saveEditedAppointment`, `sendStatusChangeEmail`, `setupEditAppointmentModal`.
- **Consultorio, ITV y servicios:** `loadSeccionesConfig`, `saveSeccionesConfig`, `loadTelefonosInteresConfig` (x2), `saveTelefonosInteresConfig`, `loadServicios`, `saveServicios`, `loadConsultorioConfig`, `saveConsultorioConfig`, `viewConsultorioDocument`, `viewConsultorioPhoto`, `viewItvDocument`, `viewItvPhoto`, `editConsultorioDocumentos`, `closeConsultorioDocumentosModal`, `editConsultorioFotos`, `closeConsultorioFotosModal`, `loadConsultorioDocumentosInModal`, `loadConsultorioFotosInModal`, `deleteConsultorioDocument`, `deleteConsultorioFoto`, `renderServicios`, `createServicioCard`, `openTelefonosInteresManager`, `closeTelefonosInteresModal`, `switchTelefonosTab`, `saveTelefonosInteres`, `loadTelefonosElementosList`, `openTelefonoElementoEditor`, `editTelefonoElemento`, `closeTelefonoElementoModal`, `toggleTelefonoElementoFields`, `saveTelefonoElemento`, `deleteTelefonoElemento`, `toggleTelefonoExpansion`, `toggleElementoExpansion`, `renderTelefonoElementoContent`.
- **Servicios (CRUD avanzado):** `loadServiciosAdmin`, `loadServiciosList`, `addServicio`, `editServicio`, `saveServicioFromModal`, `saveServicio`, `saveServicioData`, `deleteServicio`, `closeServicioModal`, `viewPhoto`, `openGenericModal`, `closeGenericModal`, `genericModalAction`, `createForm`, `openCustomModal`, `generateCustomFields`, `createCustomModal`, `handleCustomModalSubmit`.
- **Sincronización Firebase / PWA:** `migrateUsersToFirestore`, `loadUsersFromFirestore`, `loadUsersFromLocalStorage`, `syncUserToFirestore`, `registerServiceWorker`, `installPWA`, `showPWAInstallBanner`, `initializePWA`, `setupNotificationReception`.
- **APK y descargas:** `mostrarDescargaAPK`, `guardarConfiguracionAPK`, `crearSeccionDescargaAPK`.

Las subsecciones siguientes amplían cada bloque con comportamiento, parámetros y ejemplos.

### 5.2 Inicialización, navegación y layout
- `initializeApp()` inicia la sesión persistida, reconstruye botones admin, carga configuraciones (consultorio, teléfonos, citas, PWA, notificaciones) y fuerza el estado inicial con las funciones internas `forceInitialState()` y `resetNavigationState()`.
- `createAdminButton()` inyecta el botón flotante de acceso admin; útil si la maqueta cambia o se reproduce en múltiples vistas.
- `clearAllForms()` resetea formularios/menús/modales y se ata a `beforeunload` para evitar estado sucio.
- `setupEventListeners()` registra navegación suave, manejadores de formularios y atajos (`Escape`, toggles móviles).
- `loadData()`, `loadEvents()`, `loadQuickAccess()`, `loadDocuments()`, `loadAdministrators()` inicializan datos desde `localStorage` o generan semillas.
- `updateContent()` coordina `updateNewsSection()` y `updateBandoSection()`, lo que permite refrescar contenido tras cualquier CRUD.
- `scrollToSection()` y `updateActiveNavLink()` implementan navegación suave con compensación de cabecera fija.
- `openModal()`, `closeModal()`, `closeAllModals()` centralizan la UX de modales para que otras funciones puedan enfocarse en la lógica.
- `toggleMobileMenu()`, `toggleAppointmentForm()`, `closeAppointmentForm()` administran estados responsive específicos.
- `switchTab(tabName)` cambia pestañas del panel admin y desencadena cargas perezosas.
- `handleLogoUpload(e)` permite reemplazar el escudo y persistirlo.
- `renderEventos()` y `getCategoryIcon()` traducen los datos de `events` a tarjetas visibles.

**Uso recomendado:**
```javascript
// Forzar repintado de contenido luego de editar noticias
updateContent();
// Abrir cualquier modal genérico sin duplicar código
openModal('adminLoginModal');
```

### 5.3 Gestión de usuarios y autenticación
- `handleLogin`, `handleAdminLogin`, `handleRegister`, `handleCreateAdmin` responden a formularios públicos. Validan consentimientos, contraseñas y roles, almacenan en `localStorage` y sincronizan a Firestore mediante `syncUserToFirestore`.
- `login`, `register`, `logout` son variantes legacy utilizadas por botones directos; conviven para compatibilidad.
- `updateUserInterface()` y `updateAdminContent()` ajustan botones visibles, toggles de super admin y carga de pestañas sensibles.
- `openAdminPanel`/`closeAdminPanel` administran el modal principal.
- `loadUsersList` y `loadAdminsList` existen dos veces; la segunda versión (a partir de la línea ~6289) añade controles de edición/eliminación y filtrado del super admin oculto. Evita redefinir manualmente: siempre importa el orden de los `<script>`.
- `editUser`, `deleteUser`, `editAdmin`, `deleteAdmin` son stubs listos para integrarse con Firestore.
- `isSuperAdminLoggedIn` y `getSuperAdminInfo` enmascaran la presencia del super usuario.
- `openSeccionConfig`, `saveSeccionConfig`, `updateSectionTitles` habilitan ajustes visuales sin tocar el HTML estático.

**Ejemplo – login de administrador:**
```javascript
document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
```

### 5.4 Contenido editorial y recursos
- Noticias: `openNewsEditor`, `editNews`, `deleteNews`, `loadNewsList` gestionan el CRUD. La segunda serie de funciones (líneas 2083–2224) es una versión extendida con campos adicionales; asegúrate de usar un solo bloque para evitar colisiones.
- Bandos: `openBandoEditor`, `editBando`, `deleteBando`, `loadBandoList` siguen el mismo patrón.
- Documentos: `handleDocumentUpload`, `downloadDocument`, `editDocument`, `deleteDocument`, `loadDocumentsList` manejan archivos locales usando `URL.createObjectURL` como stub de almacenamiento.
- Eventos y acceso rápido: `openEventEditor`, `saveEvent`, `editEvent`, `deleteEvent`, `loadEventsList`, `loadQuickAccessList`, `loadQuickAccess`.
- `handleDataImport(e)` permite cargar un archivo JSON con backups, validando estructura en `FileReader`.

**Snippet de uso (crear evento):**
```javascript
openEventEditor();
// ...usuario rellena el formulario y pulsa guardar
saveEvent();
renderEventos();
```

### 5.5 Exportación, importación y estadísticas
- Las funciones `exportUsers`, `exportAdmins`, `exportDocuments`, `exportNotifications`, `exportNews`, `exportBandos`, `exportEvents`, `exportCulturaOcio`, `exportQuickAccess`, `exportAllData`, `exportTelefonosInteres` serializan cada entidad a JSON descargable empleando `Blob` y `URL.createObjectURL`.
- `showUserStats` y `loadSystemStats` generan tarjetas informativas bajo demanda.
- `actualizarEstadisticasNotificaciones` cuenta usuarios con FCM y produce agregados por localidad.

### 5.6 Notificaciones internas, push y centro de avisos
- `handleNotification`, `sendNotificationToUsers`, `loadNotifications`, `loadNotificationsHistory`, `updateNotificationCenter`, `showNotificationDetail`, `toggleNotificationCenter`, `markAllAsRead`, `showNotification` gobiernan el centro interno.
- Recepción push: `setupNotificationReception`, `handleReceivedNotification`, `showWebNotification`, `loadReceivedNotifications`, `displayReceivedNotifications`, `toggleNotificationsView`, `refreshReceivedNotifications`, `getTypeIcon`, `formatNotificationTime`, `markNotificationAsRead`.
- Envío push avanzado: `setupNotificationForm`, `enviarNotificacionPushConLocalidades`, `enviarNotificacionPush`, `enviarNotificacionCita`, `enviarNotificacionEvento`, `enviarNotificacionBando`, `enviarNotificacionEmergencia`, `enviarNotificacionDesdeFormulario`, `limpiarFormularioNotificacion`, `abrirModalNotificacion`, `toggleLocalidadesSelection`, `seleccionarTodasLocalidades`, `deseleccionarTodasLocalidades`, `enviarNotificacionPersonalizada`.
- Municipal alerts: `createMunicipalAlert`, `updateMunicipalNotificationBadge`, `playAlertSound`, `loadMunicipalAlerts`, `markAlertAsRead`, `clearAllAlerts`, `loadMunicipalAlertsList`, `viewAppointmentFromAlert`, `deleteAlert`.
- Público/scroll: `loadPublicNotifications`, `savePublicNotifications`, `updatePublicNotificationsScroll`, `loadPublicNotificationsList`, `openNotificationEditor`, `closePublicNotificationModal`, `savePublicNotification`, `editPublicNotification`, `toggleNotificationStatus`, `deletePublicNotification`, `refreshPublicNotifications`, `setupPublicNotificationModal`.
- **Nota importante:** hay dos funciones llamadas `downloadAttachment`. La definición final (`downloadAttachment(attachmentUrl)`) sobrescribe la versión que exigía `filename`. Si necesitas ambos comportamientos, renómbralos para evitar confusiones.

**Ejemplo – enviar push filtrado:**
```javascript
enviarNotificacionPushConLocalidades(
  'Aviso de emergencia',
  'Evacúe la zona norte de Cobreros',
  'emergencia',
  'localidades',
  ['Cobreros','Terroso']
);
```

### 5.7 Cultura y Ocio configurable
- `openCulturaOcioManager`, `closeCulturaOcioModal`, `switchCulturaTab`, `loadCulturaOcioConfig`, `saveCulturaOcio` permiten editar título global.
- Tarjetas: `loadCulturaTarjetasList`, `addCulturaTarjeta`, `editCulturaTarjeta`, `deleteCulturaTarjeta`, `saveTarjetaConfig`, `closeTarjetaConfigModal`.
- Elementos: `editCulturaTarjetaElementos`, `addCulturaTarjetaElemento`, `showCulturaTarjetaElementos`, `editCulturaTarjetaElemento`, `deleteCulturaTarjetaElemento`, `closeElementoModal`, `loadTarjetaElementosList`, `openElementoEditor`, `editElemento`, `deleteElemento`, `saveElemento`, `toggleEnlaceGroup`.
- Exportación: `exportCulturaOcio`.

**Uso típico:**
```javascript
openCulturaOcioManager();
addCulturaTarjeta(); // abre modal con formulario limpio
saveTarjetaConfig();
updateCulturaOcioSection();
```

### 5.8 Sistema de citas previas y GDPR
- Configuración general: `handleAppointment`, `loadAppointmentSettings`, `updateAppointmentUI`, `updateAppointmentMode`, `validateDNI`, `sendConfirmationEmail`, `sendAdminAlert`, `showGDPRModal`, `closeGDPRModal`, `setupGDPRModal`.
- Persistencia/listados: `loadAppointments`, `saveAppointments`, `loadAppointmentsList`, `loadAppointmentStats`, `filterAppointments`, `refreshAppointments`, `createTestAppointment`.
- Operaciones sobre citas: `getServiceName`, `getStatusText`, `formatDate`, `formatDateTime`, `updateAppointmentStatus`, `deleteAppointment`, `viewAppointmentDetails`, `editAppointment`, `closeEditAppointmentModal`, `saveEditedAppointment`, `sendStatusChangeEmail`, `setupEditAppointmentModal`.

**Ejemplo – uso programático:**
```javascript
const newStatus = 'confirmed';
updateAppointmentStatus(appointmentId, newStatus);
createMunicipalAlert(appointments.find(a => a.id === appointmentId));
```

### 5.9 Servicios municipales, consultorio e ITV
- Secciones y servicios: `loadSeccionesConfig`, `saveSeccionesConfig`, `loadServicios`, `saveServicios`, `renderServicios`, `createServicioCard`.
- Consultorio/ITV: `loadConsultorioConfig`, `saveConsultorioConfig`, `viewConsultorioDocument`, `viewConsultorioPhoto`, `viewItvDocument`, `viewItvPhoto`, `editConsultorioDocumentos`, `closeConsultorioDocumentosModal`, `editConsultorioFotos`, `closeConsultorioFotosModal`, `loadConsultorioDocumentosInModal`, `loadConsultorioFotosInModal`, `deleteConsultorioDocument`, `deleteConsultorioFoto`.
- Servicios admin: `loadServiciosAdmin`, `loadServiciosList`, `addServicio`, `editServicio`, `saveServicioFromModal`, `saveServicio`, `saveServicioData`, `deleteServicio`, `closeServicioModal`, `viewPhoto`.
- Modales genéricos: `openGenericModal`, `closeGenericModal`, `genericModalAction`, `createForm`, `openCustomModal`, `generateCustomFields`, `createCustomModal`, `handleCustomModalSubmit`.

### 5.10 Teléfonos de Interés y tarjetas
- Configuración base: `loadTelefonosInteresConfig` (dos variantes: inicialización general y precarga del modal), `saveTelefonosInteresConfig`, `saveTelefonosInteres`.
- UI: `openTelefonosInteresManager`, `closeTelefonosInteresModal`, `switchTelefonosTab`, `loadTelefonosElementosList`, `openTelefonoElementoEditor`, `editTelefonoElemento`, `closeTelefonoElementoModal`, `toggleTelefonoElementoFields`, `saveTelefonoElemento`, `deleteTelefonoElemento`, `toggleTelefonoExpansion`, `toggleElementoExpansion`, `renderTelefonoElementoContent`, `exportTelefonosInteres`.

### 5.11 Sincronización con Firebase y PWA
- Datos: `migrateUsersToFirestore`, `loadUsersFromFirestore`, `loadUsersFromLocalStorage`, `syncUserToFirestore`.
- PWA: `registerServiceWorker`, `installPWA`, `showPWAInstallBanner`, `initializePWA`, `setupNotificationReception` (vuelve a aparecer aquí por su doble rol).

**Integración mínima:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  registerServiceWorker();
});
```

### 5.12 APK y descargas
- `mostrarDescargaAPK`, `guardarConfiguracionAPK`, `crearSeccionDescargaAPK` crean/modifican la sección de descarga para la APK Android guardando su configuración en `localStorage`.

### 5.13 Helpers y utilidades
- Formatos: `formatDate`, `formatDateTime`, `getCategoryIcon`, `getServiceName`, `getStatusText`.
- UI: `toggleEnlaceGroup`, `toggleTelefonoExpansion`, `toggleElementoExpansion`, `renderTelefonoElementoContent`.
- Otros: `openCustomModal`, `generateCustomFields`, `createCustomModal`, `handleCustomModalSubmit`.

## 6. Componentes principales de la app Android (`android-app/`)
| Componente Java | Rol | APIs expuestas |
| --- | --- | --- |
| `MainActivity` | Login de usuarios y recordatorio de credenciales. | Consume Firestore/FCM a través de SDK Android. |
| `UserDashboardActivity` | Panel del ciudadano con notificaciones recibidas. | Lee colecciones `users`/`notifications`. |
| `AdminPanelActivity` | Panel administrativo móvil. | Permite CRUD de noticias/notificaciones sincronizadas. |
| `NotificationManagerActivity` | Envío de push filtradas por localidad, botones “Seleccionar Todas”. | Llama a Cloud Functions/FCM. |
| `AdminLoginActivity` / `AdminManagementActivity` | Gestión de administradores restringida al super admin TURISTEAM. | Integra Firestore `admins`. |
| `MyFirebaseMessagingService` | Recibe FCM tokens y notificaciones. | Expone métodos para manejar `onMessageReceived` y `onNewToken`. |
| `RegisterActivity` | Registro móvil sincronizado con la web. | Reutiliza validaciones y envía datos a Firestore. |
| `StatisticsActivity` | Visualiza métricas de usuarios/notificaciones. | Consulta Firestore agregando por localidad/tipo. |

> Consulta `android-app/README.md` para pasos de compilación e integración con `google-services.json`.

## 7. Service Worker (`sw.js`)
- `install` event: abre `CACHE_NAME = 'ayuntamiento-cobreros-v1'` y precarga recursos críticos.
- `activate` event: elimina versiones antiguas del cache.
- `fetch` event: implementa estrategia cache-first con fallback a red y almacenamiento dinámico.
- `push` event: recibe payloads FCM, normaliza campos (`type`, `localities`, adjuntos) y llama `registration.showNotification` con acciones.
- `notificationclick`: maneja acciones personalizadas (`view`, `close`) y abre rutas internas (`/#notification-details`).
- `notificationclose`: logging simple para auditoría.

**Registro desde el frontend:**
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## 8. Ejemplos de flujos end-to-end
1. **Registro ciudadano + notificación personalizada**
   1. `handleRegister` valida consentimientos y crea el usuario.
   2. `syncUserToFirestore` replica en Firestore.
   3. `setupNotificationForm` habilita envío.
   4. `enviarNotificacionPushConLocalidades` selecciona destinatarios.
   5. `handleReceivedNotification` agrega la notificación al centro web y `MyFirebaseMessagingService` hace lo propio en la APK.
2. **Cita previa → alerta municipal**
   1. `handleAppointment` valida DNI y consentimientos.
   2. `sendConfirmationEmail` + `sendAdminAlert` simulan correo.
   3. `createMunicipalAlert` crea alerta local y `updateMunicipalNotificationBadge` la refleja.
   4. Personal administrativo usa `loadAppointmentsList` para ver/editar y `updateAppointmentStatus` actualiza al ciudadano.

## 9. Recomendaciones de uso y pruebas
- **Duplicidades:** considera refactorizar funciones repetidas (`downloadAttachment`, `openNewsEditor`, etc.) para evitar sobreescrituras silenciosas.
- **Persistencia real:** sustituye los `URL.createObjectURL` por cargas a Firebase Storage antes de llevarlo a producción.
- **Pruebas sugeridas:**
  - Registrar/editar usuarios y administradores (`handleRegister`, `handleCreateAdmin`).
  - Simular citas en distintos estados y verificar `loadAppointmentsList`, `createMunicipalAlert`.
  - Ejecutar exportaciones masivas y reimportar con `handleDataImport`.
  - Probar registro PWA + push real tras configurar `registerServiceWorker` y claves FCM.
- **Android:** recompilar la APK con credenciales actualizadas y verificar que `NotificationManagerActivity` respeta filtros de localidad.

Con esta documentación puedes localizar cualquier API pública, saber qué dependencias comparte y cómo instrumentarla con ejemplos prácticos.
