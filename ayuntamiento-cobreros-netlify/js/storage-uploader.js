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

  const storageService = window.firebase.storage && window.firebase.storage();
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

  if (typeof storageService.uploadBytes === 'function' && typeof storageService.getDownloadURL === 'function') {
    await storageService.uploadBytes(storagePath, file, uploadMetadata);
    downloadUrl = await storageService.getDownloadURL(storagePath);
  } else if (typeof storageService.ref === 'function') {
    const fileRef = storageService.ref(storagePath);
    if (fileRef && typeof fileRef.put === 'function') {
      await fileRef.put(file, uploadMetadata);
      downloadUrl = await fileRef.getDownloadURL();
      finalStoragePath = fileRef.fullPath || storagePath;
    } else {
      throw new Error('La referencia de Storage no soporta el método put().');
    }
  } else {
    throw new Error('No se encontró un método compatible para subir archivos a Storage.');
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


