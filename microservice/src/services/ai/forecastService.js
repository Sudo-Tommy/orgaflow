/**
 * forecastService.js
 * BWA-Zukunftsprognose & Finanzspekulation mit Rate-Limit-Guard
 * (gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.6-flash, gemini-3.8-flash).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import {
    STRATEGIC_ANALYSIS_MODELS,
    getAvailableModels,
    recordModelRequest,
    markModelFailure
} from './aiModelRouter.js';

const memoryCache = new Map();

export async function generateFinancialForecast({ historical_data = [], company_info = {}, monthly_contract_costs = 0, force_refresh = false }, pbAdmin) {
    const rawHash = JSON.stringify({ historical_data, company_info, monthly_contract_costs });
    const contentHash = crypto.createHash('sha256').update(rawHash).digest('hex');

    if (!force_refresh && memoryCache.has(contentHash)) {
        const cached = memoryCache.get(contentHash);
        if (Date.now() - cached.timestamp < 3600_000) {
            return { success: true, cached: true, model: `${cached.model} (cached)`, data: cached.data };
        }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY ist serverseitig nicht konfiguriert.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const now = new Date();
    const prompt = `Du bist ein Senior CFO und Steuerexperte für deutsche Einzelunternehmen (Seniorenassistenz).
Berechne für die kommenden 12 Monate eine realistische Zukunftsprognose basierend auf:
Monatliche Fixkosten: ${monthly_contract_costs} €, Historie: ${JSON.stringify(historical_data)}, Firmeninfo: ${JSON.stringify(company_info)}.
Antworte AUSSCHLIESSLICH im JSON-Format:
{
  "forecast_months": [{
    "month": "Oktober 2026", "monthShort": "Okt", "monthIndex": 9, "year": 2026,
    "bwaRevenue": 7500.0, "bwaExpenses": 1800.0, "bwaProfit": 5700.0, "bwaTaxes": 950.0,
    "bwaNetAfterTaxes": 4750.0, "personalIncome": 250.0, "personalContracts": 850.0,
    "personalVariableExpenses": 1200.0, "personalTotalExpenses": 2050.0,
    "totalNetIncome": 5000.0, "totalCashflow": 2950.0, "confidence_score": 90, "key_drivers": ""
  }],
  "strategic_analysis": {
    "summary_headline": "", "growth_trajectory": "", "seasonal_patterns": "",
    "liquidity_risks": [], "optimization_tips": [], "confidence_overall": 88
  }
}`;

    let resultJson = null;
    let usedModel = '';
    let lastError = null;
    const candidateModels = getAvailableModels(STRATEGIC_ANALYSIS_MODELS);

    for (const model of candidateModels) {
        try {
            recordModelRequest(model);
            const aiModel = genAI.getGenerativeModel({ model, generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } });
            const res = await aiModel.generateContent(prompt);
            const text = res.response.text();
            const match = text.match(/\{[\s\S]*\}/);
            resultJson = JSON.parse(match ? match[0] : text);
            usedModel = model;
            break;
        } catch (err) {
            markModelFailure(model, err);
            lastError = err;
        }
    }

    if (!resultJson) throw new Error(`Finanzprognose konnte nicht erstellt werden: ${lastError?.message || 'Keine Antwort'}`);

    memoryCache.set(contentHash, { data: resultJson, model: usedModel, timestamp: Date.now() });

    try {
        await pbAdmin.collection('marketing_assets').create({
            title: `Finanzprognose-Spekulation ${usedModel} (${now.toLocaleDateString('de-DE')})`,
            format: 'factsheet',
            content_json: resultJson,
            source_hash: contentHash,
            target_audience: 'Geschäftsleitung',
            headline: resultJson.strategic_analysis?.summary_headline || 'Finanzprognose'
        });
    } catch {}

    return { success: true, cached: false, model: usedModel, data: resultJson };
}
