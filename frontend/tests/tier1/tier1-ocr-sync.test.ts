/**
 * Unit Tests für Offline-OCR Parser (Beleg & Rechnung inkl. IBAN) und Sync-Konfliktauflösung (Etappe 2).
 */
import '../mocks/setup';
import {
    parseDocumentOcrText,
    isValidIban,
    extractDateIso,
    extractInvoiceNumber
} from '$lib/services/ocr/receiptParser';
import { resolveSyncConflict } from '$lib/services/sync/conflictResolver';
import { registerTest, assert, assertEquals } from '../test-harness';

registerTest('T1-OCR-01', 1, 'OCR: Kassenbon Betrag, Händler, MwSt. & Datum erkennen', async () => {
    const sample = `
        REWE Markt GmbH
        Musterstraße 12
        Datum: 12.11.2026
        Wasser 2,49
        Obst 4,20
        MwSt 7%    0,44
        Summe EUR  6,69
        EC-Karte
    `;
    const parsed = parseDocumentOcrText(sample);
    assertEquals(parsed.supplier, 'REWE Markt GmbH');
    assertEquals(parsed.amount, 6.69);
    assertEquals(parsed.taxRate, 7);
    assertEquals(parsed.date, '2026-11-12');
    assert(parsed.confidence >= 0.8, `Confidence erwartet >= 0.8, war ${parsed.confidence}`);
});

registerTest('T1-OCR-02', 1, 'OCR: Eingangsrechnung mit Rechnungsnummer & valider IBAN mod-97', async () => {
    assert(isValidIban('DE89 3704 0044 0532 0130 00'), 'Bekannte gültige Test-IBAN muss bestehen');
    assert(!isValidIban('DE89 3704 0044 0532 0130 01'), 'Manipuierte IBAN muss scheitern');

    const invoiceSample = `
        Sanitätshaus Nord GmbH
        Rechnungsnummer: RE-2026-0815
        Datum: 2026-11-10
        19,00% MwSt.
        Gesamtbetrag: 119,00 EUR
        IBAN: DE89 3704 0044 0532 0130 00
    `;
    const parsed = parseDocumentOcrText(invoiceSample);
    assertEquals(parsed.supplier, 'Sanitätshaus Nord GmbH');
    assertEquals(parsed.invoiceNumber, 'RE-2026-0815');
    assertEquals(parsed.iban, 'DE89370400440532013000');
    assertEquals(parsed.amount, 119);
    assertEquals(parsed.taxRate, 19);
    assertEquals(parsed.netto, 100);
    assertEquals(extractDateIso('05.03.26'), '2026-03-05');
    assertEquals(extractInvoiceNumber('Beleg-Nr.: B-991'), 'B-991');
});

registerTest('T1-SYNC-01', 1, 'Offline-Sync: Konfliktentscheidung „Neueste Änderung gewinnt“', async () => {
    const localOlder = new Date('2026-11-12T10:00:00Z').getTime();
    const serverNewer = '2026-11-12T10:05:00Z';
    const d1 = resolveSyncConflict(serverNewer, localOlder, 'Besuchsbericht');
    assertEquals(d1.winner, 'server', 'Neuere Server-Version muss gewinnen');
    assert(Boolean(d1.message), 'Bei überschriebener Offline-Änderung muss Hinweis erzeugt werden');

    const localNewer = new Date('2026-11-12T10:10:00Z').getTime();
    const d2 = resolveSyncConflict(serverNewer, localNewer, 'Besuchsbericht');
    assertEquals(d2.winner, 'local', 'Neuere Offline-Änderung muss gewinnen');
});
