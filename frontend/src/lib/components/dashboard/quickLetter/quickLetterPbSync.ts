import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import type { LetterPositions } from './quickLetterTypes';

export async function loadLetterPositionsFromPb(): Promise<{ positions?: Partial<LetterPositions>; logoScalePercent?: number } | null> {
    if (!pb.authStore.isValid) return null;
    try {
        let template: any = (orgaStore.document_templates?.data || []).find((t: any) =>
            (t.type || '').toLowerCase() === 'brief' ||
            (t.title || '').toLowerCase().includes('din 5008')
        );

        if (!template) {
            const list = await pb.collection('document_templates').getFullList({
                filter: 'type = "brief"',
                sort: '-updated'
            });
            if (list.length > 0) template = list[0];
        }

        if (template?.content_html) {
            const data = typeof template.content_html === 'string'
                ? JSON.parse(template.content_html)
                : template.content_html;
            return {
                positions: data.positions,
                logoScalePercent: typeof data.logoScalePercent === 'number' ? data.logoScalePercent : undefined
            };
        }
    } catch (err) {
        console.warn('[QuickLetter] Fehler beim Laden aus PocketBase:', err);
    }
    return null;
}

export async function saveLetterPositionsToPb(
    positions: LetterPositions,
    logoScalePercent: number
): Promise<boolean> {
    if (!pb.authStore.isValid) return false;
    try {
        let existing: any = (orgaStore.document_templates?.data || []).find((t: any) =>
            (t.type || '').toLowerCase() === 'brief' ||
            (t.title || '').toLowerCase().includes('din 5008')
        );

        if (!existing) {
            const list = await pb.collection('document_templates').getFullList({
                filter: 'type = "brief"',
                sort: '-updated'
            });
            if (list.length > 0) existing = list[0];
        }

        const payload = {
            title: existing?.title || 'Standard Geschäftsbrief (DIN 5008)',
            type: 'brief',
            content_html: {
                positions,
                logoScalePercent,
                savedAt: new Date().toISOString()
            },
            css_style: {
                standard: 'DIN 5008 Form B',
                orientation: 'portrait'
            }
        };

        if (existing?.id) {
            await pb.collection('document_templates').update(existing.id, payload);
        } else {
            await pb.collection('document_templates').create(payload);
        }
        return true;
    } catch (err) {
        console.error('[QuickLetter] Fehler beim Speichern in PocketBase:', err);
        return false;
    }
}
