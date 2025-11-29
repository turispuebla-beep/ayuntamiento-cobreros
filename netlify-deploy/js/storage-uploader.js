/* eslint-env browser */
/* global CONFIG, waitForFirebase */
// ===== UTILIDADES PARA SUBIDA DE ARCHIVOS A FIREBASE STORAGE =====

const DEFAULT_MAX_ATTACHMENT_SIZE = CONFIG?.notifications?.maxFileSize || (10 * 1024 * 1024); // 10 MB por defecto
const DEFAULT_ALLOWED_EXTENSIONS = CONFIG?.notifications?.allowedFileTypes || ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

function storageLogInfo(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(...args);
  }
}

function storageLogWarn(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.warn === 'function') {
    window.Logger.warn(...args);
  }
}

function storageLogError(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.error === 'function') {
    window.Logger.error(...args);
  }
}

function sanitizeFileName(fileName) {
  return fileName
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function getFileExtension(fileName) {
  const match = fileName.match(/\.([^.]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

function isExtensionAllowed(extension, customAllowedExtensions = null) {
  const allowed = customAllowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;
  return allowed.some(ext => ext.toLowerCase() === extension.toLowerCase());
}

async function waitForFirebaseStorage(maxWait = 5000) {
  if (window.firebase && window.firebase.storage) {
    return true;
  }

  if (typeof waitForFirebase === 'function') {
    return waitForFirebase(maxWait);
  }

  return new Promise((resolve) => {
    let waited = 0;
    const checkInterval = 100;
    const interval = setInterval(() => {
      waited += checkInterval;
      if (window.firebase && window.firebase.storage) {
        clearInterval(interval);
        resolve(true);
      } else if (waited >= maxWait) {
        clearInterval(interval);
        storageLogWarn('⚠️ Firebase Storage no se inicializó en el tiempo esperado');
        resolve(false);
      }
    }, checkInterval);
  });
}

/**
 * Sube un archivo a Firebase Storage y retorna la metadata necesaria
 * @param {File} file - Archivo a subir
 * @param {Object} options
 * @param {string} options.folder - Carpeta principal (ej. 'appointments')
 * @param {string} options.entityId - ID de la entidad (ej. ID de cita)
 * @param {Array<string>} [options.allowedExtensions] - Extensiones permitidas (incluyendo el punto)
 * @param {number} [options.maxSize] - Tamaño máximo permitido en bytes
 * @param {Object} [options.metadata] - Metadata adicional para Firebase Storage
 * @returns {Promise<Object>} - Metadata del archivo subido
 */
async function uploadAttachment(file, {
  folder,
  entityId,
  allowedExtensions = null,
  maxSize = null,
  metadata = {}
} = {}) {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo para subir.');
  }

  // Verificar autenticación si es necesario (para rutas que requieren auth)
  const requiresAuth = folder === 'consultorio' || folder === 'appointments' || folder === 'uploads';
  if (requiresAuth) {
    if (!window.firebase || !window.firebase.auth) {
      throw new Error('Firebase Auth no está disponible. Por favor, recarga la página.');
    }
    const auth = window.firebase.auth();
    if (!auth || !auth.currentUser) {
      throw new Error('Debes estar autenticado para subir archivos. Por favor, inicia sesión como administrador.');
    }
  }

  const extension = getFileExtension(file.name);
  const sizeLimit = maxSize || DEFAULT_MAX_ATTACHMENT_SIZE;

  if (!isExtensionAllowed(extension, allowedExtensions)) {
    throw new Error(`El formato del archivo (${extension}) no está permitido.`);
  }

  if (file.size > sizeLimit) {
    throw new Error(`El archivo supera el tamaño máximo permitido de ${(sizeLimit / (1024 * 1024)).toFixed(1)} MB.`);
  }

  const firebaseReady = await waitForFirebaseStorage();
  if (!firebaseReady || !window.firebase || !window.firebase.storage) {
    throw new Error('Firebase Storage no está disponible en este momento.');
  }

  const storageService = window.firebase.storage();
  if (!storageService || (typeof storageService.ref !== 'function' && typeof storageService.uploadBytes !== 'function')) {
    throw new Error('Firebase Storage no está configurado correctamente.');
  }

  const safeFileName = sanitizeFileName(file.name);
  const timestamp = Date.now();
  const storagePath = `${folder}/${entityId}/${timestamp}_${safeFileName}`;

  const uploadMetadata = {
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      originalName: file.name,
      uploadedBy: currentUser?.email || 'anonymous',
      uploadedAt: new Date().toISOString(),
      ...metadata
    }
  };

  let downloadUrl = null;
  let finalStoragePath = storagePath;

  try {
    // Usar la API wrapper de Firebase Storage configurada en index.html
    // El wrapper ya maneja correctamente ref(), uploadBytes() y getDownloadURL()
    if (typeof storageService.uploadBytes === 'function' && typeof storageService.getDownloadURL === 'function') {
      // El wrapper ya crea el ref internamente, solo necesitamos pasar el path
      await storageService.uploadBytes(storagePath, file, uploadMetadata);
      downloadUrl = await storageService.getDownloadURL(storagePath);
    } else if (typeof storageService.ref === 'function') {
      // Fallback: usar ref() directamente
      const fileRef = storageService.ref(storagePath);
      if (fileRef) {
        // Si el ref tiene métodos de la API moderna
        if (window.firebaseStorage) {
          // Usar directamente las funciones importadas desde el módulo
          const { uploadBytes: uploadBytesFn, getDownloadURL: getDownloadURLFn, ref: refFn } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
          const storageRef = refFn(window.firebaseStorage, storagePath);
          await uploadBytesFn(storageRef, file, uploadMetadata);
          downloadUrl = await getDownloadURLFn(storageRef);
        } else {
          throw new Error('Firebase Storage no está inicializado correctamente.');
        }
      } else {
        throw new Error('No se pudo crear la referencia de Storage.');
      }
    } else {
      throw new Error('No se encontró un método compatible para subir archivos a Storage.');
    }
  } catch (error) {
    storageLogError('❌ Error subiendo archivo a Firebase Storage:', error);
    // Proporcionar un mensaje de error más descriptivo basado en el código de error
    if (error.code === 'storage/unauthorized' || error.message?.includes('permission') || error.message?.includes('Permission denied')) {
      throw new Error('No tienes permisos para subir archivos. Asegúrate de estar autenticado como administrador.');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('Se ha excedido la cuota de almacenamiento. Contacta con el administrador.');
    } else if (error.code === 'storage/canceled') {
      throw new Error('La subida del archivo fue cancelada.');
    } else {
      throw new Error(`Error al subir archivo: ${error.message || 'Error desconocido'}`);
    }
  }

  return {
    url: downloadUrl,
    storagePath: finalStoragePath,
    contentType: uploadMetadata.contentType,
    size: file.size,
    name: file.name,
    uploadedAt: uploadMetadata.customMetadata.uploadedAt
  };
}

async function deleteStorageFile(storagePath) {
  if (!storagePath) return;

  const firebaseReady = await waitForFirebaseStorage();
  if (!firebaseReady || !window.firebase || !window.firebase.storage) {
    storageLogWarn('No se pudo eliminar el archivo. Firebase Storage no está disponible.');
    return;
  }

  const storageService = window.firebase.storage();
  if (!storageService || !storageService.deleteObject) {
    storageLogWarn('No se pudo eliminar el archivo. API de Storage no disponible.');
    return;
  }

  try {
    await storageService.deleteObject(storagePath);
    storageLogInfo(`🗑️ Archivo eliminado de Storage: ${storagePath}`);
  } catch (error) {
    storageLogError('❌ Error eliminando archivo de Storage:', error);
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

if (typeof window !== 'undefined') {
  window.uploadAttachment = uploadAttachment;
  window.deleteStorageFile = deleteStorageFile;
  window.formatFileSize = formatFileSize;
}


