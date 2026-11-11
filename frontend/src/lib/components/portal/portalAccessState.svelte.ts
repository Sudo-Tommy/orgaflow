import { pb } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import QRCode from 'qrcode';
import { analyzeClientPhones, type ClientPhoneAnalysis } from "$lib/utils/phoneUtils";
import { formatClientFullName } from "$lib/utils/formatters";
import { copyPortalTextToClipboard, buildPortalWhatsAppUrl } from "./portalShareHelper";

export interface PortalTarget {
    id: string;
    collectionName?: string;
    name_first?: string;
    name_last?: string;
    company_name?: string;
    email?: string;
    phone?: string;
    handy?: string;
    portal_pin?: string;
    portal_code?: string;
    [key: string]: any;
}

export function createPortalAccessState() {
    let client = $state<PortalTarget | null>(null);
    let explicitType = $state<'client' | 'contact' | null>(null);
    let isLoading = $state(false);
    let isSaving = $state(false);
    let errorMsg = $state("");

    let portalPin = $state("");
    let portalCode = $state("");
    let customPinInput = $state("");
    let qrDataUrl = $state("");

    let phoneAnalysis = $derived<ClientPhoneAnalysis>(
        analyzeClientPhones(client?.handy, client?.phone)
    );

    let isContact = $derived(
        explicitType === 'contact' || 
        client?.company_name !== undefined || 
        client?.collectionName === 'contacts'
    );

    let displayName = $derived.by(() => {
        if (!client) return "";
        const fullName = formatClientFullName(client);
        if (client.company_name) {
            return fullName ? `${fullName} (${client.company_name})` : client.company_name;
        }
        return fullName || client.email || (isContact ? 'Kontakt' : 'Klient');
    });

    let roleTitle = $derived.by(() => {
        if (!isContact) return "Klienten-Portal";
        if (client?.company_name) return "Einrichtungs- & Betreuer-Portal";
        return "Betreuer- & Angehörigen-Portal";
    });

    let nameLabel = $derived.by(() => {
        if (!isContact) return "Ausgestellt für:";
        if (client?.company_name) return "Einrichtung / Ansprechpartner:";
        return "Betreuer / Angehörige(r):";
    });

    let fullPortalUrl = $derived.by(() => {
        if (!portalCode) return "";
        return `https://ihre-seniorenassistenz.com/portal?auth=${portalCode}`;
    });

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
        ? `http://${window.location.hostname}:3000/portal` 
        : '/api/emails/portal';

    // Generiert den QR-Code automatisch, sobald sich die Portal-URL ändert
    $effect(() => {
        if (fullPortalUrl) {
            QRCode.toDataURL(fullPortalUrl, {
                width: 240,
                margin: 2,
                color: { dark: '#0f172a', light: '#ffffff' },
                errorCorrectionLevel: 'M'
            })
            .then((url) => { qrDataUrl = url; })
            .catch((err) => { console.error("[portalAccessState] QR-Code Fehler:", err); });
        } else {
            qrDataUrl = "";
        }
    });

    async function loadAccessData(action: 'get' | 'generate' | 'set', customPin?: string) {
        if (!client) return;
        isLoading = true;
        errorMsg = "";

        try {
            const token = pb.authStore.token;
            const res = await fetch(`${apiBaseUrl}/admin/access-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    clientId: client.id,
                    type: isContact ? 'contact' : 'client',
                    action,
                    customPin
                })
            });

            let data: any = {};
            const text = await res.text();
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(res.status === 404 
                    ? "Portal-Dienst nicht erreichbar. Bitte stellen Sie sicher, dass der Server läuft." 
                    : `Serverfehler (${res.status})`
                );
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Fehler beim Laden der Zugangsdaten.");
            }

            portalPin = data.portal_pin || "";
            portalCode = data.portal_code || "";
            customPinInput = portalPin;

            // Aktualisiere auch das übergebene client-Objekt für Konsistenz
            if (client) {
                client.portal_pin = portalPin;
                client.portal_code = portalCode;
            }

            if (action === 'generate') {
                toastStore.success("Neue PIN & Zugangs-Code erfolgreich generiert!");
            } else if (action === 'set') {
                toastStore.success("Wunsch-PIN erfolgreich gespeichert!");
            }
        } catch (err: any) {
            console.error("[portalAccessState]", err);
            errorMsg = err.message || "Fehler beim Abrufen der Zugangsdaten.";
            toastStore.error(errorMsg);
        } finally {
            isLoading = false;
            isSaving = false;
        }
    }

    async function init(clientData: any, type?: 'client' | 'contact') {
        if (!clientData) return;
        client = clientData;
        explicitType = type || null;
        errorMsg = "";
        portalPin = clientData?.portal_pin || "";
        portalCode = clientData?.portal_code || "";
        customPinInput = portalPin;
        await loadAccessData('get');
    }

    function reset() {
        client = null;
        explicitType = null;
        errorMsg = "";
        portalPin = "";
        portalCode = "";
        customPinInput = "";
        qrDataUrl = "";
    }

    async function generateNew() {
        const confirmed = await confirmStore.ask(
            "Möchten Sie wirklich eine neue PIN und einen neuen Zugangs-Code generieren? Alle bisherigen Zugangslinks und QR-Codes werden damit ungültig.",
            "Neue Zugangsdaten generieren",
            "Ja, neu generieren",
            "Abbrechen",
            true
        );

        if (!confirmed) return;
        await loadAccessData('generate');
    }

    async function saveCustomPin(pinValue?: string) {
        const clean = (pinValue !== undefined ? pinValue : customPinInput).trim();
        // Flexible alphanumerische PIN: Mindestens 4 Zeichen (1B)
        if (clean.length < 4) {
            toastStore.error("Die PIN muss mindestens 4 Zeichen lang sein (z. B. 4 bis 8 Zahlen oder Buchstaben).");
            return;
        }
        isSaving = true;
        await loadAccessData('set', clean);
    }

    function copyToClipboard(text: string, label: string) {
        copyPortalTextToClipboard(text, label);
    }

    function getWhatsAppShareUrl(mode?: 'mobile' | 'landline' | 'share'): string {
        return buildPortalWhatsAppUrl(fullPortalUrl, portalPin, client, phoneAnalysis, mode);
    }

    return {
        get client() { return client; },
        get explicitType() { return explicitType; },
        get isContact() { return isContact; },
        get displayName() { return displayName; },
        get roleTitle() { return roleTitle; },
        get nameLabel() { return nameLabel; },
        get fullPortalUrl() { return fullPortalUrl; },
        get qrDataUrl() { return qrDataUrl; },
        get portalPin() { return portalPin; },
        get portalCode() { return portalCode; },
        get customPinInput() { return customPinInput; },
        set customPinInput(v: string) { customPinInput = v; },
        get isLoading() { return isLoading; },
        get isSaving() { return isSaving; },
        get errorMsg() { return errorMsg; },
        get phoneAnalysis() { return phoneAnalysis; },
        init,
        reset,
        loadAccessData,
        generateNew,
        saveCustomPin,
        copyToClipboard,
        getWhatsAppShareUrl
    };
}
