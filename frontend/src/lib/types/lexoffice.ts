export interface LexOfficeFinanceSummary {
    year: number;
    openTotal: number;
    openCount: number;
    overdueTotal: number;
    overdueCount: number;
    paidYearTotal: number;
    paidCount: number;
    expensesYearTotal: number;
}

export interface LexOfficeCompanyConfig {
    companyId: string;
    status: 'connected' | 'disconnected' | 'error';
    connected: boolean;
    needsReconnect: boolean;
    lexofficeCompanyName: string;
    lexofficeEmail: string;
    keyHint: string;
    lastError: string;
    lastSync: string | null;
    lastSyncStats: {
        created?: number;
        updated?: number;
        pushed?: number;
        paidCount?: number;
        expensesSynced?: number;
        pdfsSynced?: number;
        financeSummary?: LexOfficeFinanceSummary;
    } | null;
}

