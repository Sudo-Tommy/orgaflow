import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { toastStore } from '$lib/services/toastService.svelte';

type BackHandler = () => boolean; // return true if handled, false to fall through

/**
 * Verwaltet die Android-Hardware-Zurücktaste und Wischgesten.
 * Schließt kaskadierend offene Modale, Drawer und Dialoge vor dem Verlassen der App.
 */
class BackButtonHandler {
    private handlers: BackHandler[] = [];
    private lastBackPress = 0;
    private initialized = false;

    init(): void {
        if (this.initialized || typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
            return;
        }
        this.initialized = true;

        App.addListener('backButton', ({ canGoBack }) => {
            // 1. Prüfe spezifische Modale / Dialog-Handler (oberstes Element zuerst)
            for (let i = this.handlers.length - 1; i >= 0; i--) {
                const handled = this.handlers[i]();
                if (handled) return;
            }

            // 2. DOM-basierte Prüfung auf offene Modale mit data-modal oder data-layer-stack
            const openModals = document.querySelectorAll('[data-modal-open="true"], [role="dialog"]');
            if (openModals.length > 0) {
                const topModal = openModals[openModals.length - 1];
                const closeBtn = topModal.querySelector<HTMLButtonElement>('[data-action="close"], button[aria-label="Schließen"]');
                if (closeBtn) {
                    closeBtn.click();
                    return;
                }
            }

            // 3. Wenn im Browser-Verlauf navigiert werden kann
            if (canGoBack && window.location.pathname !== '/dashboard' && window.location.pathname !== '/') {
                window.history.back();
                return;
            }

            // 4. Doppel-Klick-Schutz vor versehentlichem Beenden der App
            const now = Date.now();
            if (now - this.lastBackPress < 2000) {
                App.exitApp();
            } else {
                this.lastBackPress = now;
                toastStore.info('Noch einmal tippen zum Beenden der App.');
            }
        });
    }

    /**
     * Registriert einen benutzerdefinierten Handler für ein Modal oder View.
     * Gibt eine Aufräumfunktion zurück.
     */
    register(handler: BackHandler): () => void {
        this.handlers.push(handler);
        return () => {
            const index = this.handlers.indexOf(handler);
            if (index !== -1) {
                this.handlers.splice(index, 1);
            }
        };
    }
}

export const backButtonHandler = new BackButtonHandler();
