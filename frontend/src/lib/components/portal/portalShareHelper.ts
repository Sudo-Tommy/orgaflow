import { toastStore } from "$lib/services/toastService.svelte";
import { formatClientSalutation } from "$lib/utils/formatters";
import type { ClientPhoneAnalysis } from "$lib/utils/phoneUtils";

export function copyPortalTextToClipboard(text: string, label: string) {
    if (!text) {
        toastStore.warning("Kein Inhalt zum Kopieren vorhanden.");
        return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            if (navigator.vibrate) navigator.vibrate(40);
            toastStore.success(`${label} in die Zwischenablage kopiert!`);
        }).catch(() => {
            toastStore.error("Kopieren fehlgeschlagen.");
        });
    }
}

export function buildPortalWhatsAppUrl(
    fullPortalUrl: string,
    portalPin: string,
    client: any,
    phoneAnalysis: ClientPhoneAnalysis,
    mode?: 'mobile' | 'landline' | 'share'
): string {
    if (!fullPortalUrl) return "";
    const greeting = formatClientSalutation(client) || "Guten Tag";
    const text = `${greeting},\n\nhier ist Ihr persönlicher Direkt-Zugang zu unserem Klienten-Portal:\n${fullPortalUrl}\n\nIhre Sicherheits-PIN lautet: ${portalPin || 'siehe Portal'}\n\nDamit können Sie jederzeit anstehende Termine, Berichte und Abrechnungen bequem einsehen.`;
    const encodedText = encodeURIComponent(text);

    if (mode === 'share') {
        return `https://api.whatsapp.com/send?text=${encodedText}`;
    }
    if (mode === 'landline' && phoneAnalysis.landline?.waNumber) {
        return `https://wa.me/${phoneAnalysis.landline.waNumber}?text=${encodedText}`;
    }
    if (mode === 'mobile' && phoneAnalysis.mobile?.waNumber) {
        return `https://wa.me/${phoneAnalysis.mobile.waNumber}?text=${encodedText}`;
    }
    if (phoneAnalysis.mobile?.waNumber) {
        return `https://wa.me/${phoneAnalysis.mobile.waNumber}?text=${encodedText}`;
    }
    return `https://api.whatsapp.com/send?text=${encodedText}`;
}
