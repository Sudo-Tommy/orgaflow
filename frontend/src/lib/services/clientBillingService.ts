import type { ClientBillingType, ClientRecord, DocumentTemplateRecord } from '$lib/types/orgaTypes';
import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';

export interface BillingTypeDefinition {
    id: ClientBillingType;
    label: string;
    shortLabel: string;
    payerType: 'kasse' | 'privat';
    defaultTaxRate: number;
    badgeClass: string;
    description: string;
}

// Alphabetisch sortiert nach dem angezeigten Text gemäß alphabetical-select.md
export const BILLING_TYPE_OPTIONS: readonly BillingTypeDefinition[] = [
    {
        id: '45a',
        label: 'Angebote zur Unterstützung (§ 45a SGB XI)',
        shortLabel: '§ 45a',
        payerType: 'kasse',
        defaultTaxRate: 0,
        badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/70 dark:text-cyan-200 dark:border-cyan-800',
        description: 'Unterstützung im Alltag über die Pflegekasse'
    },
    {
        id: 'EL',
        label: 'Entlastungsbetrag (§ 45b SGB XI - EL)',
        shortLabel: 'EL (§ 45b)',
        payerType: 'kasse',
        defaultTaxRate: 0,
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-800',
        description: '125 € monatlicher Entlastungsbetrag über die Pflegekasse'
    },
    {
        id: 'Kombi',
        label: 'Kombinationsleistung (Kombi)',
        shortLabel: 'Kombi',
        payerType: 'kasse',
        defaultTaxRate: 0,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800',
        description: 'Kombination aus Geld- und Sachleistung'
    },
    {
        id: 'Privat',
        label: 'Privatzahler / Selbstzahler',
        shortLabel: 'Privatzahler',
        payerType: 'privat',
        defaultTaxRate: 19,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800',
        description: 'Direktabrechnung an den Klienten mit MwSt.'
    },
    {
        id: 'VHP',
        label: 'Verhinderungspflege (§ 39 SGB XI - VHP)',
        shortLabel: 'VHP (§ 39)',
        payerType: 'kasse',
        defaultTaxRate: 0,
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800',
        description: 'Ersatz- und Verhinderungspflege über die Pflegekasse'
    }
] as const;

export function getBillingTypeDef(type?: string | null): BillingTypeDefinition | undefined {
    if (!type) return undefined;
    const clean = type.trim();
    return BILLING_TYPE_OPTIONS.find(b => b.id.toLowerCase() === clean.toLowerCase());
}

/**
 * Durchsucht bestehende Notizen nach typischen Abrechnungs-Kürzeln (z.B. "EL", "VHP", "Privat")
 */
export function detectBillingTypeFromNotes(notes?: string | null): ClientBillingType | null {
    if (!notes || typeof notes !== 'string') return null;
    const trimmed = notes.trim();
    if (!trimmed) return null;

    if (/^(el|elb)$/i.test(trimmed) || /\b(el|elb|entlastungsbetrag|§\s*45b)\b/i.test(trimmed)) {
        return 'EL';
    }
    if (/^(vhp)$/i.test(trimmed) || /\b(vhp|verhinderungspflege|§\s*39)\b/i.test(trimmed)) {
        return 'VHP';
    }
    if (/^(45a)$/i.test(trimmed) || /\b(45a|§\s*45a)\b/i.test(trimmed)) {
        return '45a';
    }
    if (/^(kombi)$/i.test(trimmed) || /\b(kombi|kombinationsleistung)\b/i.test(trimmed)) {
        return 'Kombi';
    }
    if (/^(privat|selbstzahler)$/i.test(trimmed) || /\b(privat|selbstzahler)\b/i.test(trimmed)) {
        return 'Privat';
    }
    return null;
}

/**
 * Bereinigt die Notizen, wenn dort lediglich oder einleitend das Kürzel stand
 */
export function cleanNotesFromBillingType(notes: string, type: ClientBillingType): string {
    if (!notes) return '';
    let result = notes;
    const patterns = [
        new RegExp(`^\\s*${type}\\s*[-:–]?\\s*`, 'i'),
        new RegExp(`\\b${type}\\b`, 'i'),
        /^(EL|VHP|Kombi|Privat|45a)$/i
    ];

    for (const pat of patterns) {
        result = result.replace(pat, '');
    }
    return result.trim();
}

/**
 * Sucht die am besten passende Rechnungsvorlage für die gewählte Abrechnungsart
 */
export function findMatchingTemplateForBillingType(
    billingType: ClientBillingType,
    templates: DocumentTemplateRecord[] = []
): DocumentTemplateRecord | undefined {
    const invoiceTemplates = templates.filter(t => (t.type || '').toLowerCase() === 'rechnung');
    const bt = billingType.toLowerCase();

    return invoiceTemplates.find(t => {
        const title = (t.title || '').toLowerCase();
        if (bt === 'el' && (title.includes('entlastung') || title.includes('45b') || title.includes('el'))) return true;
        if (bt === 'vhp' && (title.includes('verhinderung') || title.includes('39') || title.includes('vhp'))) return true;
        if (bt === 'privat' && (title.includes('privat') || title.includes('selbstzahler'))) return true;
        if (bt === '45a' && (title.includes('45a') || title.includes('unterstützung'))) return true;
        if (bt === 'kombi' && title.includes('kombi')) return true;
        return false;
    });
}

/**
 * Speichert die Abrechnungsart direkt auf dem Klienten in PocketBase
 * Aktualisiert optional gleichzeitig die verknüpfte Standard-Rechnungsvorlage
 */
export async function saveClientBillingType(
    client: ClientRecord,
    newType: ClientBillingType,
    options: { syncTemplate?: boolean; updateRates?: boolean } = { syncTemplate: true, updateRates: false }
): Promise<boolean> {
    try {
        const updateData: Record<string, any> = {
            billing_type: newType
        };

        if (options.syncTemplate) {
            const templates = (orgaStore.document_templates?.data || []) as DocumentTemplateRecord[];
            const matchedTemplate = findMatchingTemplateForBillingType(newType, templates);
            if (matchedTemplate) {
                updateData.templates = matchedTemplate.id;
                client.templates = matchedTemplate.id;
            }
        }

        if (options.updateRates) {
            const def = getBillingTypeDef(newType);
            if (def) {
                updateData.tax_rate = def.defaultTaxRate;
                client.tax_rate = def.defaultTaxRate;
            }
        }

        await pb.collection('clients').update(client.id, updateData);
        client.billing_type = newType;
        if (orgaStore.clients) {
            orgaStore.clients.optimisticUpdate(client.id, updateData);
        }
        toastStore.success(`Abrechnungsart auf "${getBillingTypeDef(newType)?.shortLabel || newType}" aktualisiert.`);
        return true;
    } catch (err: any) {
        console.error('Fehler beim Speichern der Abrechnungsart:', err);
        toastStore.error('Abrechnungsart konnte nicht gespeichert werden.');
        return false;
    }
}
