export interface PartnerSuggestion {
    id: string;
    name: string;
    type: 'partner' | 'client' | 'contract' | 'contact';
    subtitle?: string;
}
