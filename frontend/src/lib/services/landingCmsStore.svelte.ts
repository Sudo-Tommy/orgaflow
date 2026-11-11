import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import {
    type CmsData,
    type SectionMeta,
    DEFAULT_CMS_DATA,
    DEFAULT_METAS
} from './landingCmsTypes';

export * from './landingCmsTypes';

class LandingCmsService {
    content = $state<CmsData>(JSON.parse(JSON.stringify(DEFAULT_CMS_DATA)));
    meta = $state<Record<keyof CmsData, SectionMeta>>(JSON.parse(JSON.stringify(DEFAULT_METAS)));
    isLoading = $state(false);
    isSaving = $state(false);
    isInitialized = $state(false);

    async init() {
        if (this.isInitialized) return;
        await this.load();
        this.isInitialized = true;
    }

    async load() {
        this.isLoading = true;
        try {
            const records = await pb.collection('landing_page_content').getFullList({ requestKey: null });
            for (const r of records) {
                const key = r.section_key as keyof CmsData;
                if (!key || (this.content as any)[key] === undefined) continue;

                if (r.content_json) {
                    this.hydrateSection(key, r.content_json);
                }
                this.meta[key] = {
                    is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
                    order: typeof r.order === 'number' ? r.order : (DEFAULT_METAS[key]?.order ?? 1),
                    title: r.title || DEFAULT_METAS[key]?.title,
                    subtitle: r.subtitle || DEFAULT_METAS[key]?.subtitle
                };
            }
        } catch (e) {
            console.warn('[LandingCmsStore] Konnte Inhalte nicht aus DB laden (nutze Standard-Fallbacks):', e);
        } finally {
            this.isLoading = false;
        }
    }

    private hydrateSection(key: keyof CmsData, raw: any) {
        // Abwärtskompatibilität für alte Strukturen
        if (key === 'services') {
            if (Array.isArray(raw)) {
                this.content.services = {
                    headline: DEFAULT_CMS_DATA.services.headline,
                    subtitle: DEFAULT_CMS_DATA.services.subtitle,
                    items: raw
                };
            } else {
                this.content.services = { ...DEFAULT_CMS_DATA.services, ...raw };
            }
        } else if (key === 'faq') {
            if (Array.isArray(raw)) {
                this.content.faq = {
                    headline: DEFAULT_CMS_DATA.faq.headline,
                    subtitle: DEFAULT_CMS_DATA.faq.subtitle,
                    items: raw
                };
            } else {
                this.content.faq = { ...DEFAULT_CMS_DATA.faq, ...raw };
            }
        } else if (key === 'team') {
            if (raw.tommy || raw.doreen) {
                const members = [];
                if (raw.tommy) members.push({ id: 'tommy', ...raw.tommy });
                if (raw.doreen) members.push({ id: 'doreen', ...raw.doreen });
                this.content.team = {
                    headline: DEFAULT_CMS_DATA.team.headline,
                    subtitle: DEFAULT_CMS_DATA.team.subtitle,
                    members
                };
            } else {
                this.content.team = { ...DEFAULT_CMS_DATA.team, ...raw };
            }
        } else if (key === 'hero') {
            this.content.hero = { ...DEFAULT_CMS_DATA.hero, ...raw };
            if (!this.content.hero.trust_points || !this.content.hero.trust_points.length) {
                this.content.hero.trust_points = [...DEFAULT_CMS_DATA.hero.trust_points];
            }
        } else if (key === 'cooperation') {
            this.content.cooperation = { ...DEFAULT_CMS_DATA.cooperation, ...raw };
            if (!this.content.cooperation.scenarios) {
                this.content.cooperation.scenarios = [...DEFAULT_CMS_DATA.cooperation.scenarios];
            }
        } else {
            (this.content as any)[key] = { ...(DEFAULT_CMS_DATA as any)[key], ...raw };
        }
    }

    async saveSection(key: keyof CmsData) {
        this.isSaving = true;
        try {
            const data = this.content[key];
            const sectionMeta = this.meta[key] || DEFAULT_METAS[key];

            let existing = null;
            try {
                existing = await pb.collection('landing_page_content').getFirstListItem(`section_key = "${key}"`, { requestKey: null });
            } catch {}

            const payload: any = {
                section_key: key,
                content_json: data,
                is_active: sectionMeta.is_active,
                order: sectionMeta.order,
                title: sectionMeta.title || '',
                subtitle: sectionMeta.subtitle || ''
            };

            if (existing) {
                await pb.collection('landing_page_content').update(existing.id, payload);
            } else {
                await pb.collection('landing_page_content').create(payload);
            }

            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(50); } catch {}
            }

            toastStore.success(`Bereich "${(DEFAULT_METAS[key]?.title || key).toUpperCase()}" erfolgreich gespeichert.`);
        } catch (err: any) {
            console.error(`[LandingCmsStore] Fehler beim Speichern von ${key}:`, err);
            toastStore.error(`Fehler beim Speichern: ${err?.message || err}`);
            throw err;
        } finally {
            this.isSaving = false;
        }
    }

    async saveAll() {
        this.isSaving = true;
        let successCount = 0;
        const keys = Object.keys(this.content) as (keyof CmsData)[];
        
        try {
            for (const key of keys) {
                const data = this.content[key];
                const sectionMeta = this.meta[key] || DEFAULT_METAS[key];

                let existing = null;
                try {
                    existing = await pb.collection('landing_page_content').getFirstListItem(`section_key = "${key}"`, { requestKey: null });
                } catch {}

                const payload: any = {
                    section_key: key,
                    content_json: data,
                    is_active: sectionMeta.is_active,
                    order: sectionMeta.order,
                    title: sectionMeta.title || '',
                    subtitle: sectionMeta.subtitle || ''
                };

                if (existing) {
                    await pb.collection('landing_page_content').update(existing.id, payload);
                } else {
                    await pb.collection('landing_page_content').create(payload);
                }
                successCount++;
            }

            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate([50, 50, 50]); } catch {}
            }

            toastStore.success(`Alle ${successCount} Bereiche erfolgreich synchronisiert!`);
        } catch (err: any) {
            console.error('[LandingCmsStore] Fehler bei Sammelspeicherung:', err);
            toastStore.error(`Fehler bei Sammelspeicherung: ${err?.message || err}`);
        } finally {
            this.isSaving = false;
        }
    }
}

export const landingCmsStore = new LandingCmsService();
