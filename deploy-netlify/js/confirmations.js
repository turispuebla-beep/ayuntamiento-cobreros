/* global escapeHtml, setupFocusTrap, removeFocusTrap */
// ===== CONFIRMACIONES ANTES DE ELIMINAR =====
// Sistema de confirmaciones mejoradas con información del elemento

/**
 * Muestra una confirmación personalizada antes de eliminar
 * @param {string} itemName - Nombre del elemento a eliminar
 * @param {string} itemType - Tipo de elemento (opcional)
 * @param {string} customMessage - Mensaje personalizado (opcional)
 * @returns {Promise<boolean>} - true si confirma, false si cancela
 */
async function confirmDelete(itemName, itemType = 'elemento', customMessage = null) {
  const message = customMessage || 
        `¿Está seguro de que desea eliminar "${escapeHtml(itemName)}"?\n\nEsta acción no se puede deshacer.`;
    
  return new Promise((resolve) => {
    // Crear modal de confirmación
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 4000;
            animation: fadeIn 0.2s ease;
        `;
        
    modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 2rem;
                border-radius: 12px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                animation: slideUp 0.3s ease;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(239, 68, 68, 0.1);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas fa-exclamation-triangle" style="
                            color: var(--error-color, #ef4444);
                            font-size: 24px;
                        "></i>
                    </div>
                    <h3 style="
                        margin: 0;
                        color: var(--text-primary, #1f2937);
                        font-size: 1.25rem;
                    ">Confirmar eliminación</h3>
                </div>
                
                <p style="
                    color: var(--text-secondary, #6b7280);
                    margin-bottom: 1.5rem;
                    line-height: 1.6;
                    white-space: pre-line;
                ">${escapeHtml(message)}</p>
                
                <div style="
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                ">
                    <button class="btn btn-outline" id="confirmCancelBtn" style="
                        padding: 0.75rem 1.5rem;
                        border: 1px solid var(--border-color, #e5e7eb);
                        background: white;
                        color: var(--text-primary, #1f2937);
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">
                        Cancelar
                    </button>
                    <button class="btn btn-error" id="confirmDeleteBtn" style="
                        padding: 0.75rem 1.5rem;
                        background: var(--error-color, #ef4444);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        
    // Agregar animaciones si no existen
    if (!document.getElementById('confirm-modal-animations')) {
      const style = document.createElement('style');
      style.id = 'confirm-modal-animations';
      style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
      document.head.appendChild(style);
    }
        
    document.body.appendChild(modal);
        
    // Focus trap
    const focusableElements = modal.querySelectorAll('button');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
        
    firstElement.focus();
        
    // Manejar teclado
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        resolve(false);
        closeModal();
      } else if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
        
    const closeModal = () => {
      modal.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        modal.remove();
        document.removeEventListener('keydown', handleKeyDown);
      }, 200);
    };
        
    // Event listeners
    document.getElementById('confirmCancelBtn').addEventListener('click', () => {
      resolve(false);
      closeModal();
    });
        
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
      resolve(true);
      closeModal();
    });
        
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        resolve(false);
        closeModal();
      }
    });
        
    document.addEventListener('keydown', handleKeyDown);
  });
}

/**
 * Muestra un diálogo de confirmación genérico con estilos consistentes
 * @param {string} title - Título del diálogo
 * @param {string} message - Mensaje principal (se permite HTML seguro)
 * @param {'info'|'success'|'warning'|'error'} type - Tipo de mensaje para iconos/colores
 * @param {Object} [options] - Opciones adicionales
 * @param {string} [options.confirmText='Aceptar'] - Texto del botón de confirmación
 * @param {string} [options.cancelText='Cancelar'] - Texto del botón de cancelar
 * @returns {Promise<boolean>} - true si se confirma, false en caso contrario
 */
async function showConfirmation(title, message, type = 'info', options = {}) {
  const { confirmText = 'Aceptar', cancelText = 'Cancelar' } = options;
  const icons = {
    info: 'fa-circle-info',
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-exclamation'
  };
  const colors = {
    info: '#2563eb',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#ef4444'
  };
  const icon = icons[type] || icons.info;
  const color = colors[type] || colors.info;

  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5000;
        animation: fadeIn 0.2s ease;
      `;

    modal.innerHTML = `
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="genericConfirmTitle" aria-describedby="genericConfirmMessage" style="
          background: white;
          padding: 2rem;
          border-radius: 16px;
          width: min(480px, 92vw);
          box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.25);
          animation: slideUp 0.3s ease;
        ">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="
              width: 56px;
              height: 56px;
              border-radius: 50%;
              background: ${color}1A;
              display: grid;
              place-items: center;
            ">
              <i class="fas ${icon}" style="color: ${color}; font-size: 24px;"></i>
            </div>
            <h3 id="genericConfirmTitle" style="margin: 0; font-size: 1.25rem; color: var(--text-primary, #0f172a);">${escapeHtml(title)}</h3>
          </div>
          <div id="genericConfirmMessage" style="color: var(--text-secondary, #475569); line-height: 1.6; margin-bottom: 1.75rem; white-space: pre-line;">
            ${escapeHtml(message)}
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-outline" data-action="cancel" style="
              padding: 0.75rem 1.5rem;
              border-radius: 10px;
              border: 1px solid var(--border-color, #e2e8f0);
              background: white;
              color: var(--text-primary, #0f172a);
              font-weight: 500;
            ">${escapeHtml(cancelText)}</button>
            <button type="button" class="btn btn-primary" data-action="confirm" style="
              padding: 0.75rem 1.5rem;
              border-radius: 10px;
              background: ${color};
              border: none;
              color: white;
              font-weight: 600;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
            ">
              <i class="fas fa-check"></i>
              ${escapeHtml(confirmText)}
            </button>
          </div>
        </div>
      `;

    document.body.appendChild(modal);

    const dialog = modal.querySelector('.modal-content');
    const buttons = modal.querySelectorAll('button');
    const [cancelButton, confirmButton] = buttons;

    if (typeof setupFocusTrap === 'function') {
      setupFocusTrap(dialog);
    }

    confirmButton.focus();

    const cleanup = () => {
      if (typeof removeFocusTrap === 'function') {
        removeFocusTrap(dialog);
      }
      modal.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => modal.remove(), 180);
    };

    const handleConfirm = () => {
      resolve(true);
      cleanup();
    };

    const handleCancel = () => {
      resolve(false);
      cleanup();
    };

    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        handleCancel();
      }
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      } else if (event.key === 'Enter' && document.activeElement === confirmButton) {
        event.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { once: true });
  });
}

/**
 * Wrapper para funciones de eliminación con confirmación
 * @param {Function} deleteFunction - Función que realiza la eliminación
 * @param {string} itemName - Nombre del elemento
 * @param {string} itemType - Tipo de elemento
 * @param {Array} args - Argumentos para la función de eliminación
 */
async function deleteWithConfirmation(deleteFunction, itemName, itemType = 'elemento', ...args) {
  const confirmed = await confirmDelete(itemName, itemType);
  if (confirmed) {
    try {
      await deleteFunction(...args);
      if (typeof showNotification === 'function') {
        showNotification(`${itemType} "${itemName}" eliminado correctamente`, 'success');
      }
    } catch (error) {
      Logger.error('Error al eliminar:', error);
      if (typeof showNotification === 'function') {
        showNotification(`Error al eliminar ${itemType}. Inténtelo de nuevo.`, 'error');
      }
    }
  }
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.confirmDelete = confirmDelete;
  window.showConfirmation = showConfirmation;
  window.deleteWithConfirmation = deleteWithConfirmation;
}

