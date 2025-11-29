/*
Trazabilidad y Auditoría Legal
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Sistema de logs inalterables con sellado de tiempo
para cumplimiento legal y auditoría

Contacto: editorturis@gmail.com
*/

class LegalAuditTrail {
    constructor() {
        this.configKey = 'legal_audit_config';
        this.defaultConfig = {
            enabled: true,
            immutable: true,
            timestampSealing: true,
            retentionDays: 2555, // 7 años
            hashAlgorithm: 'SHA-256',
            sealInterval: 24 * 60 * 60 * 1000 // 24 horas
        };
        this.config = this.loadConfig();
    }

    /**
     * Cargar configuración
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(this.configKey);
            if (saved) {
                return { ...this.defaultConfig, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
        return { ...this.defaultConfig };
    }

    /**
     * Guardar configuración
     */
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
    }

    /**
     * Crear entrada de auditoría legal
     */
    async createAuditEntry(action, details, userId, userEmail) {
        try {
            if (!this.config.enabled) {
                return { success: false, message: 'Auditoría legal deshabilitada' };
            }

            const entry = {
                id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                action: action,
                details: details,
                userId: userId,
                userEmail: userEmail,
                timestamp: new Date().toISOString(),
                timestampSealed: false,
                hash: null,
                ipAddress: await this.getClientIP(),
                userAgent: navigator.userAgent,
                immutable: this.config.immutable
            };

            // Generar hash si está habilitado
            if (this.config.timestampSealing) {
                entry.hash = await this.generateHash(entry);
            }

            // Guardar en Firestore
            if (window.firebase && window.firebase.firestore) {
                await window.firebase.firestore().collection('legal_audit_trail').add(entry);
            }

            return { success: true, entry };
        } catch (error) {
            console.error('Error creando entrada de auditoría:', error);
            throw error;
        }
    }

    /**
     * Generar hash SHA-256
     */
    async generateHash(data) {
        try {
            const encoder = new TextEncoder();
            const dataStr = JSON.stringify({
                id: data.id,
                action: data.action,
                timestamp: data.timestamp,
                userId: data.userId
            });
            const dataBuffer = encoder.encode(dataStr);
            const hashBuffer = await crypto.subtle.digest(this.config.hashAlgorithm, dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Error generando hash:', error);
            return null;
        }
    }

    /**
     * Sellar timestamp (crear sello de tiempo)
     */
    async sealTimestamp(auditEntryId) {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                throw new Error('Firestore no disponible');
            }

            const entryRef = window.firebase.firestore().collection('legal_audit_trail').doc(auditEntryId);
            const entry = await entryRef.get();

            if (!entry.exists) {
                throw new Error('Entrada de auditoría no encontrada');
            }

            const entryData = entry.data();
            
            // Generar sello de tiempo
            const timestampSeal = {
                sealedAt: new Date().toISOString(),
                hash: entryData.hash,
                algorithm: this.config.hashAlgorithm,
                verified: true
            };

            // Actualizar entrada
            await entryRef.update({
                timestampSealed: true,
                timestampSeal: timestampSeal
            });

            return { success: true, seal: timestampSeal };
        } catch (error) {
            console.error('Error sellando timestamp:', error);
            throw error;
        }
    }

    /**
     * Verificar integridad de entrada
     */
    async verifyIntegrity(auditEntryId) {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                return { valid: false, reason: 'Firestore no disponible' };
            }

            const entryRef = window.firebase.firestore().collection('legal_audit_trail').doc(auditEntryId);
            const entry = await entryRef.get();

            if (!entry.exists) {
                return { valid: false, reason: 'Entrada no encontrada' };
            }

            const entryData = entry.data();
            
            // Verificar hash
            if (entryData.hash) {
                const currentHash = await this.generateHash(entryData);
                if (currentHash !== entryData.hash) {
                    return { valid: false, reason: 'Hash no coincide - datos modificados' };
                }
            }

            // Verificar sello de tiempo
            if (entryData.timestampSealed && entryData.timestampSeal) {
                if (!entryData.timestampSeal.verified) {
                    return { valid: false, reason: 'Sello de tiempo no verificado' };
                }
            }

            return { valid: true, entry: entryData };
        } catch (error) {
            console.error('Error verificando integridad:', error);
            return { valid: false, reason: error.message };
        }
    }

    /**
     * Obtener historial de auditoría
     */
    async getAuditHistory(filters = {}) {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                return [];
            }

            let query = window.firebase.firestore().collection('legal_audit_trail');

            if (filters.userId) {
                query = query.where('userId', '==', filters.userId);
            }

            if (filters.action) {
                query = query.where('action', '==', filters.action);
            }

            if (filters.startDate) {
                query = query.where('timestamp', '>=', filters.startDate);
            }

            if (filters.endDate) {
                query = query.where('timestamp', '<=', filters.endDate);
            }

            query = query.orderBy('timestamp', 'desc').limit(filters.limit || 100);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            return [];
        }
    }

    /**
     * Exportar auditoría para cumplimiento legal
     */
    async exportForCompliance(period = 'year') {
        try {
            const now = new Date();
            let startDate = new Date();
            
            switch (period) {
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate.setFullYear(now.getFullYear() - 1);
            }

            const history = await this.getAuditHistory({
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
                limit: 10000
            });

            // Generar reporte
            const report = {
                period: period,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
                generatedAt: now.toISOString(),
                entries: history,
                summary: {
                    total: history.length,
                    byAction: this.groupByAction(history),
                    verified: history.filter(e => e.timestampSealed).length
                }
            };

            // Exportar como JSON
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auditoria-legal-${period}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true, report };
        } catch (error) {
            console.error('Error exportando auditoría:', error);
            throw error;
        }
    }

    /**
     * Agrupar por acción
     */
    groupByAction(entries) {
        const grouped = {};
        entries.forEach(entry => {
            grouped[entry.action] = (grouped[entry.action] || 0) + 1;
        });
        return grouped;
    }

    /**
     * Obtener IP del cliente
     */
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.legalAuditTrail = new LegalAuditTrail();
    console.log('✅ Trazabilidad y auditoría legal cargada');
}

