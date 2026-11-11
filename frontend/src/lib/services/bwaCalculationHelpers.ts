export type BWAData = {
    erloeseBetrieb: number; erloeseSonstige: number; summeErloese: number;
    warenMaterial: number; fremdleistungen: number; rohertrag: number;
    personalkosten: number; raumkosten: number; steuernVersicherungen: number;
    fahrzeugkosten: number; werbeReisekosten: number; instandhaltung: number;
    verschiedeneKosten: number; summeBetriebskosten: number; ebitda: number;
    abschreibungen: number; vorlaeufigesErgebnis: number; umsatzsteuer: number;
    vorsteuer: number; revenuePaid: number; revenueOpen: number; revenue: number;
    grossProfit: number; netIncome: number; materialCosts: number; personnelCosts: number;
    roomCosts: number; operatingTaxes: number; otherOperatingExpenses: number;
};

export function calculateVmaLumpSums(appointments: any[]): number {
    let mileage = 0;
    let perDiem = 0;
    const userDays = new Map<string, { start: number; end: number }>();

    appointments.forEach((app) => {
        if (app.expand?.drive_record) {
            app.expand.drive_record.forEach((dr: any) => (mileage += (dr.km || 0) * 0.3));
        }
        if (!app.appointment || app.description?.includes('[BLOCK]')) return;
        const uId = app.user || app.expand?.user?.id || 'default_user';
        const dStr = new Date(app.appointment).toISOString().split('T')[0];
        const key = `${uId}_${dStr}`;
        if (!userDays.has(key)) userDays.set(key, { start: Infinity, end: 0 });
        const day = userDays.get(key)!;
        if (app.expand?.time_record) {
            app.expand.time_record.forEach((tr: any) => {
                if (tr.start) day.start = Math.min(day.start, new Date(tr.start).getTime());
                if (tr.end) day.end = Math.max(day.end, new Date(tr.end).getTime());
            });
        }
    });

    for (const day of userDays.values()) {
        if (day.start !== Infinity && day.end !== 0) {
            if ((day.end - day.start) / 3600000 > 8) perDiem += 14;
        }
    }
    return mileage + perDiem;
}

export function mapToBWA(
    rev: number,
    appExp: number,
    compExp: number,
    categories: Record<string, number>,
    ust: number,
    vst: number,
    vma: number
): BWAData {
    const summeErloese = rev;
    const warenMaterial = appExp;
    const rohertrag = summeErloese - warenMaterial;
    const personalkosten = categories['Personal'] || 0;
    const raumkosten = categories['Miete / Büro'] || 0;
    const steuernVersicherungen = categories['Steuern & Versicherungen'] || 0;
    const fahrzeugkosten = categories['Fahrzeuge'] || 0;
    const werbeReisekosten = (categories['Marketing'] || 0) + vma;
    const instandhaltung = categories['Instandhaltung'] || 0;
    const abschreibungen = categories['Abschreibungen'] || 0;

    const known = personalkosten + raumkosten + fahrzeugkosten + (categories['Marketing'] || 0) + steuernVersicherungen + instandhaltung + abschreibungen;
    const totalComp = Object.values(categories).reduce((s, v) => s + v, 0);
    const verschiedeneKosten = Math.max(0, totalComp - known);
    const summeBetriebskosten = personalkosten + raumkosten + steuernVersicherungen + fahrzeugkosten + werbeReisekosten + instandhaltung + verschiedeneKosten;
    const ebitda = rohertrag - summeBetriebskosten;
    const vorlaeufigesErgebnis = ebitda - abschreibungen;

    return {
        erloeseBetrieb: rev, erloeseSonstige: 0, summeErloese, warenMaterial, fremdleistungen: 0,
        rohertrag, personalkosten, raumkosten, steuernVersicherungen, fahrzeugkosten, werbeReisekosten,
        instandhaltung, verschiedeneKosten, summeBetriebskosten, ebitda, abschreibungen, vorlaeufigesErgebnis,
        umsatzsteuer: ust, vorsteuer: vst, revenuePaid: 0, revenueOpen: 0, revenue: rev, grossProfit: rohertrag,
        netIncome: vorlaeufigesErgebnis, materialCosts: warenMaterial, personnelCosts: personalkosten,
        roomCosts: raumkosten, operatingTaxes: steuernVersicherungen, otherOperatingExpenses: verschiedeneKosten + fahrzeugkosten + werbeReisekosten
    };
}
