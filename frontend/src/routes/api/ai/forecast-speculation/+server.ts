import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import {
    buildCacheOptimizedPrompt,
    getAvailableFrontendModels,
    recordFrontendModelRequest,
    markFrontendModelFailure
} from '$lib/utils/tokenSaverEngine';

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

        // 1. Caching Prüfung
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
                        model: 'gemini-3.5-flash-lite (cached)',
                        data: cached.content_json
                    });
                }
            } catch {}
        }

        const ai = new GoogleGenAI({ apiKey });
        const now = new Date();
        const currentMonthName = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

        const staticSystemInstruction = `Du bist ein hochqualifizierter Senior Chief Financial Officer (CFO), Steuerexperte (deutsches Steuerrecht: EStG, GewStG, UStG) und Business Intelligence Analyst.
Aufgabe: Für ein deutsches inhabergeführtes Einzelunternehmen im Bereich mobiler Seniorenassistenz ("Seniorenassistenz Jenzsch", Sachsen-Anhalt) eine hochpräzise 12-Monats-Zukunftsprognose berechnen.

BRANCHE & BETRIEB:
- Kerngeschäft: § 45b SGB XI (131 €/Monat Entlastungsbetrag), Verhinderungspflege § 39 SGB XI, private Selbstzahler.
- Typische Saisonalität: Gedämpft Jul/Aug, Jahresendspurt Okt–Dez, stabil Jan–Apr.
- Steuern: GewSt Freibetrag 24.500 €, Steuermesszahl 3,5%, Hebesatz ~400%. ESt Grundtarif § 32a EStG. GewSt-Anrechnung § 35 EStG.

BERECHNUNGSRICHTLINIEN:
1. Realen Umsatztrend, Kundenbasis, Ausgabenquote sorgfältig analysieren.
2. Realistische Wachstums- und Kapazitätsgrenzen + saisonale Effekte einberechnen.
3. Steuerliche Abzüge (ESt, GewSt, USt) monatlich berechnen.
4. Freien Cashflow für jeden der 12 Monate mathematisch präzise berechnen.
5. Fundierte strategische Analyse mit konkreten Handlungsempfehlungen.
Antworte exakt nach dem vorgegebenen JSON-Schema. Kein Vorgeplänkel.`;

        const dynamicUserPrompt = `Aktueller Zeitpunkt: ${currentMonthName} (${now.toISOString()}).
Historische Monatsdaten:
${JSON.stringify(historical_data, null, 2)}
Monatliche private Fixkosten aus Verträgen: ${monthly_contract_costs} Euro.
Unternehmenskontext: ${JSON.stringify(company_info)}
Berechne jetzt für die kommenden 12 rollierenden Monate die präzise Zukunftsspekulation.`;

        const { systemPart, userPart } = buildCacheOptimizedPrompt(staticSystemInstruction, dynamicUserPrompt, { skipEnvelope: true });
        const candidateModels = getAvailableFrontendModels();

        const schema = {
            type: Type.OBJECT,
            properties: {
                forecast_months: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            month: { type: Type.STRING },
                            monthShort: { type: Type.STRING },
                            monthIndex: { type: Type.NUMBER },
                            year: { type: Type.NUMBER },
                            bwaRevenue: { type: Type.NUMBER },
                            bwaExpenses: { type: Type.NUMBER },
                            bwaProfit: { type: Type.NUMBER },
                            bwaTaxes: { type: Type.NUMBER },
                            bwaNetAfterTaxes: { type: Type.NUMBER },
                            personalIncome: { type: Type.NUMBER },
                            personalContracts: { type: Type.NUMBER },
                            personalVariableExpenses: { type: Type.NUMBER },
                            personalTotalExpenses: { type: Type.NUMBER },
                            totalNetIncome: { type: Type.NUMBER },
                            totalCashflow: { type: Type.NUMBER },
                            confidence_score: { type: Type.NUMBER },
                            key_drivers: { type: Type.STRING }
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
                        summary_headline: { type: Type.STRING },
                        growth_trajectory: { type: Type.STRING },
                        seasonal_patterns: { type: Type.STRING },
                        liquidity_risks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        optimization_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
                        confidence_overall: { type: Type.NUMBER }
                    },
                    required: ['summary_headline', 'growth_trajectory', 'seasonal_patterns', 'liquidity_risks', 'optimization_tips', 'confidence_overall']
                }
            },
            required: ['forecast_months', 'strategic_analysis']
        };

        let resultData: any = null;
        let usedModel = '';
        let lastError: any = null;

        for (const modelName of candidateModels) {
            try {
                recordFrontendModelRequest(modelName);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: userPart,
                    config: {
                        systemInstruction: systemPart,
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
                markFrontendModelFailure(modelName, err);
                lastError = err;
                console.warn(`[AI Forecast Speculation] Modell ${modelName} fehlgeschlagen:`, err?.message || err);
            }
        }

        if (!resultData) {
            throw error(500, `Finanzprognose konnte nicht berechnet werden: ${lastError?.message || 'Keine Antwort'}`);
        }

        try {
            await pbAdmin.collection('marketing_assets').create({
                title: `Finanzprognose-Spekulation ${usedModel} (${new Date().toLocaleDateString('de-DE')})`,
                format: 'forecast_speculation',
                content_json: resultData,
                source_hash: contentHash,
                target_audience: 'Geschäftsleitung',
                headline: resultData.strategic_analysis?.summary_headline || 'Finanzprognose',
                body_text: resultData.strategic_analysis?.growth_trajectory || ''
            });
        } catch {}

        return json({
            success: true,
            cached: false,
            model: usedModel,
            data: resultData
        });
    } catch (e: any) {
        console.error('[AI Forecast Speculation Error]:', e);
        if (e.status && e.body) throw e;
        throw error(500, e.message || 'Fehler bei der Zukunftsspekulation.');
    }
};
