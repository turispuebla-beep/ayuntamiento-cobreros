/**
 * Enlace mínimo del botón ADMIN → modal de login.
 * Se carga antes de script.js para que funcione aunque falle Firebase o la init principal.
 */
(function () {
    function openAdminLoginModalDirect() {
        var modal = document.getElementById('adminLoginModal');
        if (!modal) {
            console.error('No se encontró #adminLoginModal');
            return;
        }
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    window.openAdminLoginModalDirect = openAdminLoginModalDirect;

    function onAdminButtonClick(event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof window.handleAdminAccessClick === 'function') {
            void window.handleAdminAccessClick();
            return;
        }
        openAdminLoginModalDirect();
    }

    function bindAdminAccessButton() {
        var btn = document.getElementById('adminLoginBtn');
        if (!btn || btn.dataset.adminBootstrapBound === '1') {
            return;
        }
        btn.type = 'button';
        btn.dataset.adminBootstrapBound = '1';
        btn.addEventListener('click', onAdminButtonClick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAdminAccessButton);
    } else {
        bindAdminAccessButton();
    }
})();
