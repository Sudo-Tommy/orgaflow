import { 
    Folder, Clock, FileText, FileCheck, ShieldCheck, Sparkles, File as FileIcon 
} from "lucide-svelte";

export const PORTAL_DOCUMENT_CATEGORIES = [
    { id: "all", label: "Alle Dokumente", icon: Folder },
    { id: "Zeitnachweise", label: "Zeitnachweise", icon: Clock, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { id: "Rechnungen & Nachweise", label: "Rechnungen & Nachweise", icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { id: "Verträge & Vereinbarungen", label: "Verträge & Vereinbarungen", icon: FileCheck, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { id: "Pflegekassenbescheide", label: "Pflegekassenbescheide", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { id: "Vollmachten & Verfügungen", label: "Vollmachten & Verfügungen", icon: FileText, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { id: "Scans & Nachweise", label: "Scans & Nachweise", icon: Sparkles, color: "text-teal-600 bg-teal-50 border-teal-200" },
    { id: "Sonstige Dokumente", label: "Sonstige Dokumente", icon: FileIcon, color: "text-neutral-600 bg-neutral-100 border-neutral-200" }
];

export function getAuthToken(): string {
    if (typeof window !== 'undefined') {
        const portalToken = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
        if (portalToken) return portalToken;
    }
    return "";
}

export function getApiBaseUrl(): string {
    return (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com'))
        ? `http://${window.location.hostname}:3000/portal`
        : '/api/emails/portal';
}

export function formatDate(val?: string): string {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    } catch {}
    return val.split(' ')[0] || '—';
}

export function getCategoryBadge(category?: string) {
    switch (category) {
        case 'Verträge & Vereinbarungen':
            return { label: 'Vertrag', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
        case 'Pflegekassenbescheide':
            return { label: 'Pflegekasse', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        case 'Vollmachten & Verfügungen':
            return { label: 'Vollmacht', color: 'bg-amber-50 text-amber-700 border-amber-200' };
        case 'Scans & Nachweise':
            return { label: 'Nachweis', color: 'bg-blue-50 text-blue-700 border-blue-200' };
        default:
            return { label: 'Dokument', color: 'bg-neutral-100 text-neutral-700 border-neutral-200' };
    }
}
