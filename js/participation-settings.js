/* global isAdmin, showNotification, currentUser */

// ===== GESTIÓN DE CONFIGURACIÓN DE PARTICIPACIÓN CIUDADANA =====

/**
 * Cargar configuración de participación
 */
function loadParticipationSettings() {
    try {
        const saved = localStorage.getItem('participationSettings');
        if (saved) {
            const config = JSON.parse(saved);
            
            // Actualizar checkboxes en admin
            const moduleCheckbox = document.getElementById('participationModuleEnabled');
            const surveysCheckbox = document.getElementById('participationSurveysEnabled');
            const suggestionsCheckbox = document.getElementById('participationSuggestionsEnabled');
            
            if (moduleCheckbox) moduleCheckbox.checked = config.moduleEnabled !== false;
            if (surveysCheckbox) surveysCheckbox.checked = config.surveysEnabled !== false;
            if (suggestionsCheckbox) suggestionsCheckbox.checked = config.suggestionsEnabled !== false;
            
            return config;
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
    }
    
    // Valores por defecto
    return {
        moduleEnabled: true,
        surveysEnabled: true,
        suggestionsEnabled: true
    };
}

/**
 * Guardar configuración de participación
 */
function saveParticipationSettings() {
    if (!isAdmin) {
        showNotification('Solo los administradores pueden cambiar esta configuración', 'error');
        return;
    }
    
    const moduleCheckbox = document.getElementById('participationModuleEnabled');
    const surveysCheckbox = document.getElementById('participationSurveysEnabled');
    const suggestionsCheckbox = document.getElementById('participationSuggestionsEnabled');
    
    if (!moduleCheckbox || !surveysCheckbox || !suggestionsCheckbox) {
        showNotification('Error: No se encontraron los controles de configuración', 'error');
        return;
    }
    
    const config = {
        moduleEnabled: moduleCheckbox.checked,
        surveysEnabled: surveysCheckbox.checked,
        suggestionsEnabled: suggestionsCheckbox.checked,
        updatedBy: currentUser ? currentUser.email : 'admin',
        updatedAt: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('participationSettings', JSON.stringify(config));
        
        // Actualizar configuración en el módulo
        if (typeof CitizenParticipation !== 'undefined') {
            CitizenParticipation.config = config;
            CitizenParticipation.renderCitizenParticipation();
        }
        
        // Mostrar/ocultar enlace del menú
        const navLink = document.querySelector('a[href="#participacion"]');
        if (navLink) {
            if (!config.moduleEnabled) {
                navLink.style.display = 'none';
            } else {
                navLink.style.display = '';
            }
        }
        
        showNotification('✅ Configuración de participación ciudadana guardada correctamente', 'success');
        
        console.log('💾 Configuración guardada:', config);
    } catch (error) {
        console.error('❌ Error guardando configuración:', error);
        showNotification('Error al guardar la configuración', 'error');
    }
}

// Cargar configuración al iniciar
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        // Cargar cuando se abre la pestaña de participación
        const participationTab = document.getElementById('participation-admin-tab');
        if (participationTab) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const isVisible = participationTab.style.display !== 'none';
                        if (isVisible && isAdmin) {
                            loadParticipationSettings();
                        }
                    }
                });
            });
            observer.observe(participationTab, { attributes: true });
        }
        
        // Cargar configuración inicial
        setTimeout(() => {
            loadParticipationSettings();
        }, 1000);
    });
}

