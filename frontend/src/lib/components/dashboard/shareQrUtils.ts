import { pb } from "$lib/services/pocketbase";
import QRCode from 'qrcode';

export type TabType = 'client-portal' | 'contact-portal' | 'vcard' | 'appointment' | 'portal';

export async function ensurePortalCode(record: any, type: 'client' | 'contact', onUpdated?: () => void) {
    if (!record || record.portal_code) return;
    try {
        const token = pb.authStore.token;
        const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
            ? `http://${window.location.hostname}:3000/portal` 
            : '/api/emails/portal';
        
        const res = await fetch(`${apiBaseUrl}/admin/access-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                clientId: record.id,
                type: type,
                action: 'get'
            })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.portal_code && (!record.portal_code || record.portal_code !== data.portal_code)) {
                record.portal_code = data.portal_code;
                onUpdated?.();
            }
        }
    } catch (e) {
        console.warn('[ShareQrModal] Portal-Code konnte nicht vorab erzeugt werden:', e);
    }
}

export function buildQrText(
    activeTab: TabType,
    selectedClient: any,
    selectedContact: any,
    selectedAppointment: any,
    vcardSource: 'me' | 'contact',
    selectedVcardContact: any,
    companyName?: string
): string {
    const isClientPortal = activeTab === 'client-portal' || activeTab === 'portal';
    if (isClientPortal) {
        if (!selectedClient) return '';
        const authKey = selectedClient.portal_code || selectedClient.id;
        return `https://ihre-seniorenassistenz.com/portal?auth=${authKey}`;
    }
    if (activeTab === 'contact-portal') {
        if (!selectedContact) return '';
        const authKey = selectedContact.portal_code || selectedContact.id;
        return `https://ihre-seniorenassistenz.com/portal?auth=${authKey}`;
    }
    if (activeTab === 'vcard') {
        if (vcardSource === 'contact' && selectedVcardContact) {
            const fn = selectedVcardContact.name_first || '';
            const ln = selectedVcardContact.name_last || '';
            const company = selectedVcardContact.company_name || '';
            const phone = selectedVcardContact.phone || '';
            const email = selectedVcardContact.email || '';
            const street = selectedVcardContact.street ? `${selectedVcardContact.street} ${selectedVcardContact.housenr || ''}`.trim() : '';
            const city = selectedVcardContact.city || '';
            const zip = selectedVcardContact.zip || '';

            return `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${fn};;;\nFN:${fn} ${ln}`.trim() + 
                (company ? `\nORG:${company}` : '') + 
                (phone ? `\nTEL;TYPE=CELL:${phone}` : '') + 
                (email ? `\nEMAIL:${email}` : '') + 
                (street || city ? `\nADR:;;${street};${city};;${zip};Deutschland` : '') + 
                `\nEND:VCARD`;
        } else {
            const u = pb.authStore.model;
            const firstName = u?.name_first || '';
            const lastName = u?.name_last || '';
            const phone = u?.phone || u?.handy || '';
            const email = u?.email || '';
            const comp = companyName || 'OrgaFlow Seniorenassistenz';
            
            return `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${firstName} ${lastName}\nORG:${comp}\nTEL;TYPE=CELL:${phone}\nEMAIL:${email}\nURL:https://ihre-seniorenassistenz.com\nEND:VCARD`;
        }
    }
    if (activeTab === 'appointment') {
        if (!selectedAppointment) {
            return `https://ihre-seniorenassistenz.com/portal`;
        }
        return `https://ihre-seniorenassistenz.com/portal/appointments?id=${selectedAppointment.id}`;
    }
    return '';
}

export async function generateQrCode(text: string): Promise<string> {
    if (!text) return '';
    return await QRCode.toDataURL(text, {
        width: 320,
        margin: 2,
        color: {
            dark: '#1e1b4b',
            light: '#ffffff'
        }
    });
}

export function downloadQrFile(qrDataUrl: string, targetName: string) {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `orgaflow-${targetName}-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
}
