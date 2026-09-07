import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

async function getAdminPb() {
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);
    const adminEmail = process.env.PB_ADMIN_EMAIL || env.PB_ADMIN_EMAIL;
    const adminPass = process.env.PB_ADMIN_PASSWORD || env.PB_ADMIN_PASSWORD;
    if (adminEmail && adminPass) {
        try {
            await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
        } catch (e) {
            console.error('[AI Forecast Speculation] Superuser Auth fehlgeschlagen:', e);
        }
    }
    return pb;
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const {
            historical_data = [],
            company_info = {},
            monthly_contract_costs = 0,
            force_refresh = false
        } = body;

        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw error(500, 'GEMINI_API_KEY ist serverseitig nicht konfiguriert.');
        }

        const rawHashInput = JSON.stringify({ historical_data, company_info, monthly_contract_costs });
        const contentHash = crypto.createHash('sha256').update(rawHashInput).digest('hex');
        const pbAdmin = await getAdminPb();

        // 1. Caching Prüfung (falls schon berechnet)
        if (!force_refresh) {
            try {
                const cached = await pbAdmin.collection('marketing_assets').getFirstListItem(
                    `format = "forecast_speculation" && source_hash = "${contentHash}"`,
                    { requestKey: null }
                );
                if (cached && cached.content_json) {
                    return json({
                        success: true,
                        cached: true,
                        model: 'gemini-3.8-flash (cached)',
                        data: cached.content_json
                    });
                }
            } catch {}
        }

        // 2. Gemini 3.8 Flash Vorbereitung
        const ai = new GoogleGenAI({ apiKey });
        const now = new Date();
        const currentMonthName = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

        const systemInstruction = `Du bist ein hochqualifizierter Senior Chief Financial Officer (CFO), Steuerexperte (deutsches Steuerrecht: EStG, GewStG, UStG) und Business Intelligence Analyst.
Deine Aufgabe ist es, für ein deutsches inhabergeführtes Einzelunternehmen im Bereich der mobilen Seniorenassistenz und Alltagsbegleitung ("Seniorenassistenz Jenzsch" in Sachsen-Anhalt: Halle Saale & Lutherstadt Wittenberg) eine hochpräzise, realitätsnahe und spekulative 12-Monats-Zukunftsprognose zu berechnen.

Kerninformationen der Branche & des Betriebs:
- Kerngeschäft: Betreuungs- und Entlastungsleistungen nach § 45b SGB XI (Entlastungsbetrag 131 €/Monat je Pflegebedürftigem ab Pflegegrad 1), Verhinderungspflege nach § 39 SGB XI und private Selbstzahlerleistungen.
- Abrechnung: Großteils Direktabrechnung mit Pflegekassen via Abtretungserklärung sowie Privatrechnungen.
- Typische Saisonalität:
  * Leicht gedämpfte Nachfrage im Hochsommer (Juli/August durch Urlaubszeiten pflegender Angehöriger).
  * Spürbarer Jahresendspurt (Oktober bis Dezember), da Restansprüche des Jahresbudgets der Pflegekassen ausgeschöpft werden.
  * Stabile Basisauslastung in den Wintermonaten (Januar bis April).
- Steuern:
  * Gewerbesteuer: Freibetrag 24.500 € Gewerbeertrag; Steuermesszahl 3,5%, Hebesatz ca. 400%.
  * Gewerbesteuer-Anrechnung auf ESt nach § 35 EStG (bis Faktor 4,0).
  * Einkommensteuer nach Grundtarif § 32a EStG (Grundfreibetrag ca. 11.784 €).
  * Umsatzsteuer nach Regelbesteuerung (19%), sofern nicht umsatzsteuerfreie Pflegeleistungen vorliegen.

Deine Berechnungsrichtlinien:
1. Analysiere die übergebenen realen Ist-Monate sorgfältig auf Umsatztrend, Kundenbasis, Betriebsausgabenquote und Ausgabenstruktur.
2. Spekuliere die kommenden 12 Monate nicht nur als sturen linearen Mittelwert, sondern:
   - Integriere realistische Wachstums- und Kapazitätsgrenzen sowie saisonale Effekte.
   - Berücksichtige moderate Kostensteigerungen (Inflation, Kraftstoffkosten).
   - Berechne für jeden Monat die steuerlichen Abzüge (ESt, GewSt, USt) und die privaten Ausgaben (Fixkosten + geschätzte Lebenshaltung).
3. Berechne den freien Cashflow für jeden der 12 Monate so mathematisch präzise wie möglich.
4. Formuliere eine fundierte strategische Analyse mit konkreten Handlungsempfehlungen.`;

        const userPrompt = `Hier sind die realen historischen Finanzdaten der vergangenen Monate sowie die fixen Vertragskosten:
Aktueller Zeitpunkt: ${currentMonthName} (${now.toISOString()}).

Historische Monatsdaten:
${JSON.stringify(historical_data, null, 2)}

Monatliche private Fixkosten aus Verträgen: ${monthly_contract_costs} Euro.
Unternehmenskontext: ${JSON.stringify(company_info)}

Berechne jetzt für die kommenden 12 rollierenden Monate die präzise Zukunftsspekulation. Antworte exakt nach dem vorgegebenen JSON-Schema.`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                forecast_months: {
                    type: Type.ARRAY,
                    description: "Die 12 kommenden Monate in chronologischer Reihenfolge",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            month: { type: Type.STRING, description: "Monatsname und Jahr, z.B. 'Oktober 2026'" },
                            monthShort: { type: Type.STRING, description: "Kurzform, z.B. 'Okt'" },
                            monthIndex: { type: Type.NUMBER, description: "0-basierter Monatsindex (0=Jan, 11=Dez)" },
                            year: { type: Type.NUMBER, description: "Das Kalenderjahr" },
                            bwaRevenue: { type: Type.NUMBER, description: "Prognostizierter BWA-Umsatz in Euro" },
                            bwaExpenses: { type: Type.NUMBER, description: "Prognostizierte BWA-Betriebsausgaben in Euro" },
                            bwaProfit: { type: Type.NUMBER, description: "Vorsteuergewinn (bwaRevenue - bwaExpenses)" },
                            bwaTaxes: { type: Type.NUMBER, description: "Geschätzte Steuern (ESt + GewSt + USt) in Euro" },
                            bwaNetAfterTaxes: { type: Type.NUMBER, description: "Verbleibender Gewerbe-Nettoüberschuss" },
                            personalIncome: { type: Type.NUMBER, description: "Geschätzte private Zusatzeinnahmen (z.B. Kindergeld, Nebenertrag)" },
                            personalContracts: { type: Type.NUMBER, description: "Private fixe Vertragskosten" },
                            personalVariableExpenses: { type: Type.NUMBER, description: "Variable private Lebenshaltungskosten" },
                            personalTotalExpenses: { type: Type.NUMBER, description: "Summe private Ausgaben" },
                            totalNetIncome: { type: Type.NUMBER, description: "Gesamtes Nettoeinkommen (bwaNetAfterTaxes + personalIncome)" },
                            totalCashflow: { type: Type.NUMBER, description: "Freier monatlicher Cashflow (totalNetIncome - personalTotalExpenses)" },
                            confidence_score: { type: Type.NUMBER, description: "Prognose-Konfidenz in Prozent (0 bis 100)" },
                            key_drivers: { type: Type.STRING, description: "1-2 Kernursachen / Einflussfaktoren für diesen Monat" }
                        },
                        required: [
                            'month', 'monthShort', 'monthIndex', 'year',
                            'bwaRevenue', 'bwaExpenses', 'bwaProfit', 'bwaTaxes', 'bwaNetAfterTaxes',
                            'personalIncome', 'personalContracts', 'personalVariableExpenses', 'personalTotalExpenses',
                            'totalNetIncome', 'totalCashflow', 'confidence_score', 'key_drivers'
                        ]
                    }
                },
                strategic_analysis: {
                    type: Type.OBJECT,
                    properties: {
                        summary_headline: { type: Type.STRING, description: "Prägnante Überschrift der Zukunftsprognose" },
                        growth_trajectory: { type: Type.STRING, description: "Einschätzung der Ertragskurve (z.B. Starkes Wachstum, Stabile Seitwärtsphase)" },
                        seasonal_patterns: { type: Type.STRING, description: "Erkannte saisonale Besonderheiten im Jahresverlauf" },
                        liquidity_risks: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "Identifizierte Liquiditäts- oder Steuerrisiken"
                        },
                        optimization_tips: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "Konkrete operative Ratschläge zur Ertrags- und Cashflow-Steigerung"
                        },
                        confidence_overall: { type: Type.NUMBER, description: "Gesamte Zuverlässigkeit der Modellrechnung in Prozent" }
                    },
                    required: ['summary_headline', 'growth_trajectory', 'seasonal_patterns', 'liquidity_risks', 'optimization_tips', 'confidence_overall']
                }
            },
            required: ['forecast_months', 'strategic_analysis']
        };

        const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'];
        let resultData: any = null;
        let usedModel = '';
        let lastError: any = null;

        for (const modelName of candidateModels) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: userPrompt,
                    config: {
                        systemInstruction,
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        temperature: 0.2
                    }
                });

                if (response.text) {
                    resultData = JSON.parse(response.text);
                    usedModel = modelName;
                    break;
                }
            } catch (err: any) {
                lastError = err;
                console.warn(`[AI Forecast Speculation] Modell ${modelName} fehlgeschlagen:`, err?.message || err);
            }
        }

        if (!resultData) {
            throw error(500, `Gemini API Fehler: ${lastError?.message || 'Keine Antwort von Gemini erhalten'}`);
        }

        // 3. Im Cache speichern
        try {
            await pbAdmin.collection('marketing_assets').create({
                title: `Finanzprognose-Spekulation Gemini 3.8 (${new Date().toLocaleDateString('de-DE')})`,
                format: 'forecast_speculation',
                content_json: resultData,
                source_hash: contentHash,
                target_audience: 'Geschäftsleitung',
                headline: resultData.strategic_analysis?.summary_headline || 'KI Finanzprognose',
                body_text: resultData.strategic_analysis?.growth_trajectory || ''
            });
        } catch (dbErr) {
            console.warn('[AI Forecast Speculation] Cache-Speicherung in PocketBase übersprungen:', dbErr);
        }

        return json({
            success: true,
            cached: false,
            model: usedModel,
            data: resultData
        });

    } catch (e: any) {
        console.error('[AI Forecast Speculation Error]:', e);
        if (e.status && e.body) throw e;
        throw error(500, e.message || 'Fehler bei der KI-Zukunftsspekulation.');
    }
};
