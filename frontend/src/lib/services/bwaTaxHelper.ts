/**
 * bwaTaxHelper.ts
 * Errechnet alle relevanten deutschen Steuerabgaben:
 * - Gewerbesteuer (GewSt mit Freibetrag 24.500 €, Messzahl 3,5 %, Hebesatz 400 %)
 * - Einkommensteuer (ESt nach § 32a EStG Einkommensteuertarif)
 * - § 35 EStG Gewerbesteuer-Anrechnung (Ermäßigung bis 4,0-fache des GewSt-Messbetrags)
 * - Solidaritätszuschlag (5,5 % mit bundesweiter Freigrenze)
 * - Umsatzsteuer-Zahllast (Vereinnahmte USt abzüglich abziehbarer Vorsteuer für UStVA)
 * - Betriebliche Steuern & Reingewinn nach Steuern
 */

export function calculateTaxEstimate(
    profit: number, 
    viewMode: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
    umsatzsteuer: number = 0,
    vorsteuer: number = 0,
    operatingTaxes: number = 0
) {
    const factor = viewMode === 'monthly' ? 12 : (viewMode === 'quarterly' ? 4 : 1);
    const safeProfit = profit || 0;
    const ust = umsatzsteuer || 0;
    const vst = vorsteuer || 0;
    const opTaxes = operatingTaxes || 0;
    const ustZahllast = ust - vst;

    if (safeProfit <= 0) {
        return {
            profit: safeProfit,
            factor,
            gewerbeErtrag: 0,
            gewStFreibetrag: Math.round(24500 / factor),
            gewStMessbetrag: 0,
            gewerbesteuer: 0,
            rawESt: 0,
            gewStAnrechnung: 0,
            einkommensteuer: 0,
            soli: 0,
            totalTaxes: 0,
            ertragsteuern: 0,
            effectiveRate: 0,
            netAfterTaxes: safeProfit,
            umsatzsteuer: ust,
            vorsteuer: vst,
            ustZahllast,
            isUStErstattung: ustZahllast < 0,
            operatingTaxes: opTaxes,
            gesamteAbgaben: Math.max(0, ustZahllast) + opTaxes,
            liquiditaetNachAllenAbgaben: safeProfit - Math.max(0, ustZahllast)
        };
    }

    const annualProfit = safeProfit * factor;

    // 1. Gewerbesteuer
    const gewerbeErtrag = Math.max(0, annualProfit - 24500);
    const annualMessbetrag = gewerbeErtrag * 0.035;
    const annualGewSt = annualMessbetrag * 4.0;
    const gewerbesteuer = Math.round(annualGewSt / factor);

    // 2. Einkommensteuer nach § 32a EStG
    let rawAnnualESt = 0;
    const zvE = annualProfit;

    if (zvE <= 11784) {
        rawAnnualESt = 0;
    } else if (zvE <= 17005) {
        const y = (zvE - 11784) / 10000;
        rawAnnualESt = (995.21 * y + 1400) * y;
    } else if (zvE <= 66760) {
        const z = (zvE - 17005) / 10000;
        rawAnnualESt = (208.85 * z + 2397) * z + 1015.51;
    } else if (zvE <= 277825) {
        rawAnnualESt = 0.42 * zvE - 10636.31;
    } else {
        rawAnnualESt = 0.45 * zvE - 18971.06;
    }

    // § 35 EStG: Gewerbesteuer-Anrechnung
    const annualGewStAnrechnung = Math.min(rawAnnualESt, annualMessbetrag * 4.0);
    const annualESt = Math.max(0, rawAnnualESt - annualGewStAnrechnung);
    const einkommensteuer = Math.round(annualESt / factor);

    // Solidaritätszuschlag
    const annualSoli = annualESt > 18130 ? (annualESt * 0.055) : 0;
    const soli = Math.round(annualSoli / factor);

    const ertragsteuern = gewerbesteuer + einkommensteuer + soli;
    const effectiveRate = safeProfit > 0 ? (ertragsteuern / safeProfit) * 100 : 0;
    const netAfterTaxes = safeProfit - ertragsteuern;
    const gesamteAbgaben = ertragsteuern + Math.max(0, ustZahllast) + opTaxes;
    const liquiditaetNachAllenAbgaben = safeProfit - ertragsteuern - Math.max(0, ustZahllast);

    return {
        profit: safeProfit,
        factor,
        gewerbeErtrag: Math.round(gewerbeErtrag / factor),
        gewStFreibetrag: Math.round(24500 / factor),
        gewStMessbetrag: Math.round(annualMessbetrag / factor),
        gewerbesteuer,
        rawESt: Math.round(rawAnnualESt / factor),
        gewStAnrechnung: Math.round(annualGewStAnrechnung / factor),
        einkommensteuer,
        soli,
        totalTaxes: ertragsteuern,
        ertragsteuern,
        effectiveRate,
        netAfterTaxes,
        umsatzsteuer: ust,
        vorsteuer: vst,
        ustZahllast,
        isUStErstattung: ustZahllast < 0,
        operatingTaxes: opTaxes,
        gesamteAbgaben,
        liquiditaetNachAllenAbgaben
    };
}
