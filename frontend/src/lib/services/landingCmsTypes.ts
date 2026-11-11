export interface CmsHero {
    title: string;
    subtitle: string;
    cta_primary: string;
    cta_primary_link: string;
    cta_secondary: string;
    cta_secondary_link: string;
    badge: string;
    trust_points: string[];
    eyeccatcher_badge?: string;
    eyecatcher_badge?: string;
    eyecatcher_title: string;
    eyecatcher_text: string;
    eyecatcher_button: string;
}

export interface CmsServiceItem {
    id: string;
    title: string;
    desc: string;
    icon: string;
    tag?: string;
}

export interface CmsServices {
    headline: string;
    subtitle: string;
    items: CmsServiceItem[];
}

export interface CmsProcessStep {
    id: string;
    step: string;
    title: string;
    text: string;
}

export interface CmsProcess {
    headline: string;
    subtitle: string;
    steps: CmsProcessStep[];
}

export interface CmsTeamMember {
    id: string;
    name: string;
    role: string;
    location: string;
    phone: string;
    email: string;
    desc: string;
    avatarUrl?: string;
    avatar?: string;
    userId?: string;
}

export interface CmsTeam {
    headline: string;
    subtitle: string;
    members: CmsTeamMember[];
}

export interface CmsScenarioItem {
    id: string;
    tag: string;
    title: string;
    text: string;
}

export interface CmsCooperation {
    headline: string;
    subtitle: string;
    text: string;
    partner_badges: string[];
    scenarios: CmsScenarioItem[];
}

export interface CmsQualityFeature {
    id: string;
    title: string;
    text: string;
}

export interface CmsQuality {
    headline: string;
    subtitle: string;
    features: CmsQualityFeature[];
}

export interface CmsFaqItem {
    id: string;
    q: string;
    a: string;
}

export interface CmsFaq {
    headline: string;
    subtitle: string;
    items: CmsFaqItem[];
}

export interface CmsAppointment {
    headline: string;
    subtitle: string;
    button_text: string;
}

export interface CmsContact {
    headline: string;
    subtitle: string;
    address_halle: string;
    address_wittenberg: string;
    phone_central: string;
    email_central: string;
    opening_hours_halle: string;
    opening_hours_wittenberg: string;
    note: string;
}

export interface CmsData {
    hero: CmsHero;
    services: CmsServices;
    process: CmsProcess;
    team: CmsTeam;
    cooperation: CmsCooperation;
    quality: CmsQuality;
    faq: CmsFaq;
    appointment: CmsAppointment;
    contact: CmsContact;
}

export interface SectionMeta {
    is_active: boolean;
    order: number;
    title?: string;
    subtitle?: string;
}

export { DEFAULT_CMS_DATA, DEFAULT_METAS } from './landingCmsDefaults';
