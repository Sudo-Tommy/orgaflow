import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';

export interface CmsHero {
    title: string;
    subtitle: string;
    cta_primary: string;
    cta_secondary: string;
    badge: string;
}

export interface CmsServiceItem {
    id: string;
    title: string;
    desc: string;
    icon: string;
}

export interface CmsTeamMember {
    name: string;
    role: string;
    location: string;
    phone: string;
    email: string;
    desc: string;
}

export interface CmsTeam {
    tommy: CmsTeamMember;
    doreen: CmsTeamMember;
}

export interface CmsCooperation {
    headline: string;
    text: string;
    partner_badges: string[];
}

export interface CmsFaqItem {
    q: string;
    a: string;
}

export interface CmsContact {
    address_halle: string;
    address_wittenberg: string;
    phone_central: string;
    email_central: string;
    opening_hours: string;
}

export interface CmsData {
    hero: CmsHero;
    services: CmsServiceItem[];
    team: CmsTeam;
    cooperation: CmsCooperation;
    faq: CmsFaqItem[];
    contact: CmsContact;
}

export interface SectionMeta {
    is_active: boolean;
    order: number;
    title?: string;
    subtitle?: string;
}

const DEFAULT_CMS_DATA: CmsData = {
    hero: {
        title: "Zuhause wohlfühlen. Selbstbestimmt leben.",
        subtitle: "Ihre verlässliche und herzliche Seniorenassistenz in Halle (Saale) und der Lutherstadt Wittenberg. Wir unterstützen Sie und Ihre Angehörigen bei Behördengängen, Arztbesuchen und im Alltag.",
        cta_primary: "Kostenloses Erstgespräch anfragen",
        cta_secondary: "Leistungen entdecken",
        badge: "Anerkannter Partner aller Pflegekassen nach § 45b SGB XI"
    },
    services: [
        { id: "1", title: "Alltagsbegleitung mit Herz", desc: "Begleitung zu Arztterminen, Einkäufen, Banken, kulturellen Veranstaltungen und gemeinsamen Spaziergängen.", icon: "🤝" },
        { id: "2", title: "Bürokratie & Schriftverkehr", desc: "Unterstützung beim Sortieren von Unterlagen, Ausfüllen von Pflege- und Behördenanträgen sowie Telefonaten.", icon: "📑" },
        { id: "3", title: "Haushaltsnahe Entlastung", desc: "Kleine Handgriffe, Pflanzenpflege, Einkaufsplanung und Strukturierung des häuslichen Umfelds.", icon: "🏡" },
        { id: "4", title: "Entlastungsbetrag §45b", desc: "Vollständige Abrechnungsmöglichkeit mit Ihrer Pflegekasse über das monatliche Budget von 131 €.", icon: "💶" }
    ],
    team: {
        tommy: {
            name: "Tommy Jenzsch",
            role: "Inhaber & Seniorenassistent",
            location: "Standort Halle (Saale)",
            phone: "0151 57515432",
            email: "tommy@ihre-seniorenassistenz.com",
            desc: "Verlässlicher Partner mit Fokus auf Organisation, Mobilität und strukturierte Betreuung im Alltag."
        },
        doreen: {
            name: "Doreen Jenzsch",
            role: "Inhaberin & Seniorenassistentin",
            location: "Standort Lutherstadt Wittenberg",
            phone: "0160 7303830",
            email: "doreen@ihre-seniorenassistenz.com",
            desc: "Einfühlsame Alltagsbegleiterin mit Herz, Geduld und viel Freude am gemeinsamen Austausch."
        }
    },
    cooperation: {
        headline: "Kostenübernahme & Zusammenarbeit mit den Pflegekassen",
        text: "Wir arbeiten Hand in Hand mit allen gesetzlichen und privaten Pflegekassen. Durch unsere offizielle Anerkennung schöpfen Sie Ihre Ansprüche – vor allem den Entlastungsbetrag (§ 45b SGB XI, 131 €/Monat) und die Verhinderungspflege (§ 39 SGB XI) – voll aus. Wir rechnen auf Wunsch direkt per Abtretungserklärung ab, sodass Sie nicht in Vorkasse gehen müssen.",
        partner_badges: ["AOK PLUS", "Barmer", "Techniker Krankenkasse", "DAK Gesundheit", "IKK gesund plus", "Knappschaft", "Private Pflegekassen"]
    },
    faq: [
        { q: "Übernimmt die Pflegekasse die Kosten für die Seniorenassistenz?", a: "Ja, in den allermeisten Fällen vollständig! Ab Pflegegrad 1 steht Ihnen der monatliche Entlastungsbetrag (131 €/Monat) zu. Ab Pflegegrad 2 kann zusätzlich das Budget der Verhinderungspflege (§ 39 SGB XI) genutzt werden. Wir rechnen direkt mit der Kasse ab – ohne Vorkasse." },
        { q: "Muss ich einen langfristigen Vertrag abschließen?", a: "Nein, bei uns gibt es keine starren Knebelverträge. Wir arbeiten nach konkreter Vereinbarung und Bedarf." },
        { q: "Wie läuft das Kennenlernen ab?", a: "Das erste Kennenlerngespräch bei Ihnen zu Hause ist für Sie vollkommen kostenfrei und unverbindlich. Bei einer gemütlichen Tasse Kaffee besprechen wir in Ruhe Ihre Wünsche." }
    ],
    contact: {
        address_halle: "Dreyhauptstr. 2, 06108 Halle (Saale)",
        address_wittenberg: "Lutherstadt Wittenberg & Umgebung",
        phone_central: "0345 / 213 895 20",
        email_central: "info@ihre-seniorenassistenz.com",
        opening_hours: "Mo - Fr: 08:00 - 18:00 Uhr und nach Vereinbarung"
    }
};

const DEFAULT_METAS: Record<keyof CmsData, SectionMeta> = {
    hero: { is_active: true, order: 1, title: 'Hero & Startbereich' },
    services: { is_active: true, order: 2, title: 'Leistungsbausteine' },
    team: { is_active: true, order: 3, title: 'Team & Standorte' },
    cooperation: { is_active: true, order: 4, title: 'Kassen & Pflegegrade' },
    faq: { is_active: true, order: 5, title: 'Häufig gestellte Fragen' },
    contact: { is_active: true, order: 6, title: 'Kontaktdaten & Anschriften' }
};

class LandingCmsService {
    // Svelte 5 $state runes
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
                if (key && (this.content as any)[key] !== undefined) {
                    if (r.content_json) {
                        (this.content as any)[key] = r.content_json;
                    }
                    this.meta[key] = {
                        is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
                        order: typeof r.order === 'number' ? r.order : (DEFAULT_METAS[key]?.order ?? 1),
                        title: r.title || DEFAULT_METAS[key]?.title,
                        subtitle: r.subtitle || DEFAULT_METAS[key]?.subtitle
                    };
                }
            }
        } catch (e) {
            console.warn('[LandingCmsStore] Konnte Inhalte nicht aus DB laden (nutze Standard-Fallbacks):', e);
        } finally {
            this.isLoading = false;
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

            toastStore.success(`Bereich "${key.toUpperCase()}" erfolgreich gespeichert.`);
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
        try {
            for (const key of Object.keys(this.content) as (keyof CmsData)[]) {
                await this.saveSection(key);
            }
            toastStore.success('Alle Landing-Page Inhalte erfolgreich gespeichert!');
        } catch (err: any) {
            toastStore.error('Fehler beim Speichern aller Bereiche.');
            throw err;
        } finally {
            this.isSaving = false;
        }
    }
}

export const landingCmsStore = new LandingCmsService();
