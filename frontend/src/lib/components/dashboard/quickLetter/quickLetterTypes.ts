export type PositionKey = 'logo' | 'absender' | 'anschrift' | 'datum' | 'betreff' | 'body';

export interface ElementPosition {
    x: number;
    y: number;
    w: number;
    h: number;
}

export type LetterPositions = Record<PositionKey, ElementPosition>;

export interface QuickLetterCompany {
    id: string;
    name: string;
    street?: string;
    housenr?: string;
    zip?: string;
    city?: string;
    number_telephone?: string;
    number_mobile?: string;
    email?: string;
    website?: string;
    bank_name?: string;
    bank_iban?: string;
    bank_bic?: string;
    vatcode?: string;
    ik_number?: string;
    logo?: string;
}

export interface QuickLetterRecipient {
    salutation: string;
    firstname: string;
    lastname: string;
    company: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;
}

export interface QuickLetterData {
    recipient: QuickLetterRecipient;
    date: string;
    reference: string;
    subject: string;
    body: string;
    closingSalutation: string;
    senderName: string;
    includeContactUnderLogo: boolean;
    includeFooter: boolean;
}
