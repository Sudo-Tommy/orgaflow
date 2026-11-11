/**
 * receiptService.js
 * Analysiert Kassenbons & Belege über die Vision-Modell-Kaskade mit Rate-Limit-Guard
 * (gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.6-flash, gemini-3.8-flash).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    VISION_DOCUMENT_MODELS,
    getAvailableModels,
    recordModelRequest,
    markModelFailure
} from './aiModelRouter.js';

export async function processReceiptImage({ imageBase64, mimeType }) {
    if (!imageBase64) throw new Error('Kein Bild übergeben.');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API Key fehlt im Server.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateReceiptModels = getAvailableModels(VISION_DOCUMENT_MODELS);

    const prompt = `Analysiere diesen Kassenbon/Rechnung und extrahiere die wichtigsten Daten.
Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt. Verwende KEINE Markdown-Blöcke (kein \`\`\`json).
Nutze exakt dieses Format:
{
  "title": "Kurzer Zweck der Ausgabe (z.B. Büromaterial, Tanken)",
  "supplier": "Name des Geschäfts oder Ausstellers (z.B. Aral, MediaMarkt, Adobe)",
  "amount": "Der Brutto-Endbetrag als reine Zahl (z.B. 14.50)",
  "netto": "Der Netto-Betrag als reine Zahl (z.B. 12.18, falls ausgewiesen)",
  "tax_sum": "Die enthaltene Steuer als reine Zahl (z.B. 2.32, falls ausgewiesen)",
  "tax_rate": "Der angewandte Steuersatz als reine Zahl (z.B. 19 oder 7)",
  "invoice_nr": "Rechnungsnummer oder Belegnummer (falls vorhanden, sonst leer)",
  "date": "Das Datum auf dem Beleg im Format YYYY-MM-DD",
  "category": "Ordne es zwingend EINER dieser Kategorien zu: 'Miete / Büro', 'Software / IT', 'Marketing', 'Fahrzeuge', 'Personal', oder 'Sonstiges'",
  "box_2d": [ymin, xmin, ymax, xmax],
  "is_installment": false,
  "installment_current": "",
  "installment_total_count": "",
  "installment_total_amount": ""
}`;

    const imagePart = { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } };
    let lastErr = null;
    let responseText = null;

    for (const mName of candidateReceiptModels) {
        try {
            recordModelRequest(mName);
            const receiptModel = genAI.getGenerativeModel({ model: mName });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout 12s für Modell ${mName}`)), 12000)
            );
            const result = await Promise.race([
                receiptModel.generateContent([prompt, imagePart]),
                timeoutPromise
            ]);
            responseText = result.response.text();
            if (responseText) break;
        } catch (err) {
            markModelFailure(mName, err);
            console.warn(`[KI Receipt] Modell ${mName} fehlgeschlagen:`, err.message);
            lastErr = err;
        }
    }

    if (!responseText) {
        throw lastErr || new Error('Kein KI-Modell konnte den Beleg verarbeiten.');
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
}
