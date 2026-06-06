// ===== BANNER ROTATIVO =====
// Sistema de banners/carrusel en hero section

const BannerRotativo = {
    banners: [],
    currentIndex: 0,
    intervalId: null,
    autoplayDelay: 5000, // 5 segundos
    isPlaying: false,

    /**
     * Inicializa el banner rotativo
     */
    init(banners = []) {
        if (banners.length > 0) {
            this.banners = banners;
        } else {
            // Cargar banners desde Firestore o usar defaults
            this.loadBanners();
        }

        this.createBannerHTML();
        this.attachEventListeners();
        
        if (this.banners.length > 1) {
            this.startAutoplay();
        }
    },

    /**
     * Carga banners desde Firestore
     */
    async loadBanners() {
        try {
            if (window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const bannersRef = db.collection('banners');
                const snapshot = await bannersRef.where('activo', '==', true).get();
                
                this.banners = [];
                snapshot.forEach(doc => {
                    this.banners.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                // Ordenar por orden de visualización
                this.banners.sort((a, b) => (a.orden || 0) - (b.orden || 0));
            }
        } catch (error) {
            console.error('[BannerRotativo] Error cargando banners:', error);
            // Usar banners por defecto
            this.setDefaultBanners();
        }

        if (this.banners.length === 0) {
            this.setDefaultBanners();
        }
    },

    /**
     * Establece banners por defecto
     */
    setDefaultBanners() {
        this.banners = [
            {
                id: 'default-1',
                titulo: 'Bienvenida al Ayuntamiento de Cobreros',
                descripcion: 'Portal de datos y enlaces de interés e información local',
                imagen: 'images/escudo-cobreros.jpg',
                enlace: '#inicio',
                botonTexto: 'Conocer más',
                activo: true
            }
        ];
    },

    /**
     * Crea el HTML del banner
     */
    createBannerHTML() {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;

        // Crear contenedor de banners
        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'banner-rotativo-container';
        bannerContainer.innerHTML = `
            <div class="banner-slides" id="bannerSlides">
                ${this.banners.map((banner, index) => this.createBannerSlide(banner, index)).join('')}
            </div>
            ${this.banners.length > 1 ? `
                <div class="banner-controls">
                    <button class="banner-nav banner-prev" onclick="BannerRotativo.prevBanner()" aria-label="Banner anterior">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="banner-nav banner-next" onclick="BannerRotativo.nextBanner()" aria-label="Banner siguiente">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="banner-indicators" id="bannerIndicators">
                        ${this.banners.map((_, index) => `
                            <button class="banner-indicator ${index === 0 ? 'active' : ''}" 
                                    onclick="BannerRotativo.goToBanner(${index})" 
                                    aria-label="Ir al banner ${index + 1}">
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // Insertar antes del contenido del hero
        const heroContent = heroSection.querySelector('.hero-content');
        if (heroContent && heroContent.parentNode === heroSection) {
            heroSection.insertBefore(bannerContainer, heroContent);
            heroContent.style.position = 'relative';
            heroContent.style.zIndex = '2';
        } else if (heroContent) {
            // Si heroContent existe pero no es hijo directo, insertar al inicio
            heroSection.insertBefore(bannerContainer, heroSection.firstChild);
        } else {
            heroSection.appendChild(bannerContainer);
        }

        // Estilos CSS inline (mejor agregarlos al CSS principal)
        this.addBannerStyles();
    },

    /**
     * Crea el HTML de un slide de banner
     */
    createBannerSlide(banner, index) {
        const isActive = index === 0 ? 'active' : '';
        const backgroundImage = banner.imagen ? `background-image: url('${banner.imagen}');` : '';
        
        return `
            <div class="banner-slide ${isActive}" data-index="${index}" style="${backgroundImage}">
                <div class="banner-overlay"></div>
                <div class="banner-content">
                    <h2 class="banner-title">${this.escapeHtml(banner.titulo || '')}</h2>
                    ${banner.descripcion ? `<p class="banner-description">${this.escapeHtml(banner.descripcion)}</p>` : ''}
                    ${banner.botonTexto ? `
                        <a href="${banner.enlace || '#inicio'}" class="btn btn-primary btn-large banner-button">
                            ${this.escapeHtml(banner.botonTexto)}
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Agrega estilos CSS para el banner
     */
    addBannerStyles() {
        if (document.getElementById('bannerRotativoStyles')) return;

        const style = document.createElement('style');
        style.id = 'bannerRotativoStyles';
        style.textContent = `
            .banner-rotativo-container {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 400px;
                overflow: hidden;
            }
            .banner-slides {
                position: relative;
                width: 100%;
                height: 100%;
            }
            .banner-slide {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                opacity: 0;
                transition: opacity 0.8s ease-in-out;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .banner-slide.active {
                opacity: 1;
                z-index: 1;
            }
            .banner-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(30, 58, 138, 0.8) 0%, rgba(59, 130, 246, 0.6) 100%);
                z-index: 1;
            }
            .banner-content {
                position: relative;
                z-index: 2;
                text-align: center;
                color: white;
                padding: 2rem;
                max-width: 800px;
            }
            .banner-title {
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 1rem;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .banner-description {
                font-size: 1.25rem;
                margin-bottom: 2rem;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            .banner-controls {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            .banner-nav {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
            }
            .banner-nav:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            .banner-indicators {
                display: flex;
                gap: 0.5rem;
            }
            .banner-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;
                background: transparent;
                cursor: pointer;
                transition: all 0.3s;
            }
            .banner-indicator.active {
                background: white;
            }
            .banner-indicator:hover {
                transform: scale(1.2);
            }
            @media (max-width: 768px) {
                .banner-title {
                    font-size: 1.75rem;
                }
                .banner-description {
                    font-size: 1rem;
                }
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Adjunta event listeners
     */
    attachEventListeners() {
        // Pausar autoplay al hacer hover
        const container = document.querySelector('.banner-rotativo-container');
        if (container) {
            container.addEventListener('mouseenter', () => this.pauseAutoplay());
            container.addEventListener('mouseleave', () => this.startAutoplay());
        }

        // Navegación con teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevBanner();
            if (e.key === 'ArrowRight') this.nextBanner();
        });
    },

    /**
     * Muestra un banner específico
     */
    showBanner(index) {
        if (index < 0 || index >= this.banners.length) return;

        const slides = document.querySelectorAll('.banner-slide');
        const indicators = document.querySelectorAll('.banner-indicator');

        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });

        indicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });

        this.currentIndex = index;
    },

    /**
     * Siguiente banner
     */
    nextBanner() {
        const nextIndex = (this.currentIndex + 1) % this.banners.length;
        this.showBanner(nextIndex);
        this.resetAutoplay();
    },

    /**
     * Banner anterior
     */
    prevBanner() {
        const prevIndex = (this.currentIndex - 1 + this.banners.length) % this.banners.length;
        this.showBanner(prevIndex);
        this.resetAutoplay();
    },

    /**
     * Ir a un banner específico
     */
    goToBanner(index) {
        this.showBanner(index);
        this.resetAutoplay();
    },

    /**
     * Inicia el autoplay
     */
    startAutoplay() {
        if (this.banners.length <= 1 || this.isPlaying) return;

        this.isPlaying = true;
        this.intervalId = setInterval(() => {
            this.nextBanner();
        }, this.autoplayDelay);
    },

    /**
     * Pausa el autoplay
     */
    pauseAutoplay() {
        this.isPlaying = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    /**
     * Reinicia el autoplay
     */
    resetAutoplay() {
        this.pauseAutoplay();
        this.startAutoplay();
    },

    /**
     * Escapa HTML para prevenir XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.BannerRotativo = BannerRotativo;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        BannerRotativo.init();
    });
} else {
    BannerRotativo.init();
}

