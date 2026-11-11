export const DOCUMENT_TYPE_OPTIONS = [
    { value: 'Antrag', label: 'Antrag' },
    { value: 'Kündigung', label: 'Kündigung' },
    { value: 'Sonstiges', label: 'Sonstiges' },
    { value: 'Vertrag', label: 'Vertrag' },
    { value: 'Vollmacht', label: 'Vollmacht' }
];

export const DOCUMENT_STATUS_OPTIONS = [
    { value: 'Abgeschlossen', label: 'Abgeschlossen' },
    { value: 'Eingereicht (Wartet auf Antwort)', label: 'Eingereicht (Wartet auf Antwort)' },
    { value: 'Entwurf', label: 'Entwurf' },
    { value: 'Unterschrieben / Gültig', label: 'Unterschrieben / Gültig' },
    { value: 'Widerrufen / Ungültig', label: 'Widerrufen / Ungültig' },
    { value: 'Zur Unterschrift vorgelegt', label: 'Zur Unterschrift vorgelegt' }
];

export function toYMD(val: string): string {
    if (!val) return "";
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return val.substring(0, 10);
}
