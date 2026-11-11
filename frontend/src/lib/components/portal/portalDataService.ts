import { goto } from "$app/navigation";
import { pb } from "$lib/services/pocketbase";
import { resolveDocumentUrl } from "$lib/utils/documentUrl";
import { portalBlockedState } from "./portalBlockedState.svelte";
import { impersonationService } from "$lib/services/impersonationService.svelte";
export { formatClientSalutation, formatClientFullName, type ClientSalutationInput } from "$lib/utils/formatters";

export function getPortalAuthToken(): string {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
        if (token) return token;
    }
    return pb.authStore.token || "";
}

export function performPortalLogout() {
    if (typeof window !== 'undefined') {
        ['portal_token', 'portal_admin_mode', 'portal_stay_logged_in'].forEach(k => localStorage.removeItem(k));
        sessionStorage.removeItem('portal_token');
    }
    // Falls ein Inhaber gerade ein Konto imitiert, beenden wir sauber die Imitation
    if (impersonationService.isImpersonating) {
        impersonationService.stopImpersonation();
        return;
    }
    const model = pb.authStore.model || pb.authStore.record;
    const isOwnerOrDev = pb.authStore.isSuperuser || 
        model?.role === 'developer' || 
        model?.role === 'superadmin' || 
        (model?.email || '').toLowerCase().includes('jenzsch');
    
    if (isOwnerOrDev) {
        goto('/dashboard');
        return;
    }

    pb.authStore.clear();
    goto('/portal');
}

export async function validatePortalSession(apiBaseUrl: string, token: string): Promise<boolean> {
    if (!token) return false;
    try {
        const res = await fetch(`${apiBaseUrl}/validate-session`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (data.isBlocked || res.status === 403) {
            portalBlockedState.show(data.error);
            return false;
        }
        return res.ok && data.valid === true;
    } catch {
        return false;
    }
}

export async function fetchPortalData(apiBaseUrl: string, token: string) {
    const headers = { 'Authorization': `Bearer ${token}` };
    const [appRes, invRes, clientRes, docRes] = await Promise.all([
        fetch(`${apiBaseUrl}/appointments`, { headers }),
        fetch(`${apiBaseUrl}/invoices`, { headers }),
        fetch(`${apiBaseUrl}/clients`, { headers }),
        fetch(`${apiBaseUrl}/documents`, { headers })
    ]);
    if (!appRes.ok) {
        if (appRes.status === 403) {
            const errData = await appRes.json().catch(() => ({}));
            portalBlockedState.show(errData.error || "Ihr Portal-Zugang ist derzeit gesperrt.");
            return null;
        }
        if (appRes.status === 401) {
            performPortalLogout();
            return null;
        }
        throw new Error("Fehler beim Laden der Termine.");
    }
    const invData = invRes.ok ? await invRes.json() : { invoices: [] };
    const clientData = clientRes.ok ? await clientRes.json() : { clients: [] };
    const docData = docRes.ok ? await docRes.json() : { documents: [] };
    const appData = await appRes.json();

    return {
        appointments: (appData.appointments || []).filter((a: any) => a.is_private !== true && a.is_visible !== false),
        invoices: (invData.invoices || []).map((inv: any) => ({
            ...inv, files: (inv.files || []).map((f: any) => ({ ...f, url: resolveDocumentUrl(f.url) }))
        })),
        companyInfo: invData.companyInfo || null,
        documents: (docData.documents || []).map((d: any) => ({ ...d, url: resolveDocumentUrl(d.url) })),
        clients: clientData.clients || []
    };
}
