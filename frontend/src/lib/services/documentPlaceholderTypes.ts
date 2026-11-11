export interface PlaceholderContext {
    client: any;
    recipientType: string;
    recipientId: string;
    company: any;
    effectiveUser: any;
    onBehalfOfUserId: string;
    manualIssueDate: string;
    verhinderungVon: string;
    verhinderungBis: string;
    isTimesheet?: boolean;
    overrideData?: any;
    isAddressContext?: boolean;
    orgaStore: any;
    invoiceData?: any;
    timesheetData?: any;
    hourlyWage?: number;
    kmRate?: number;
    taxRate?: string;
    assistantUser?: any;
}

export function safeFormatDate(val: string) {
    if (!val) return '';
    const clean = val.trim().replace(' ', 'T');
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    }
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    return val.split(' ')[0];
}
