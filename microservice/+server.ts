import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

// CORS-Header zentral definiert
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Helper function to replace @sveltejs/kit json
function json(data: any, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: { ...init?.headers, 'Content-Type': 'application/json' }
    });
}

// Separater Handler für CORS-Preflight Anfragen
export const OPTIONS = async () => {
    return new Response(null, { headers: corsHeaders });
};

export const POST = async ({ request }: { request: Request }) => {
    try {
        const body = await request.json();

        // --- WEICHE: TravelTime Proxy ---
        if (body.origin && body.destination) {
            const { origin, destination } = body;
            const app_id = "560be999"; // Standard-App-ID für TravelTime
            
            const response = await fetch('https://api.traveltimeapp.com/v4/routes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Application-Id': app_id,
                    'X-Api-Key': process.env.TRAVELTIME_API_KEY || ''
                },
                body: JSON.stringify({
                    locations: [
                        { id: 'origin', coords: { lat: 0, lng: 0 }, address: origin },
                        { id: 'dest', coords: { lat: 0, lng: 0 }, address: destination }
                    ],
                    arrival_searches: [{
                        id: 'search', arrival_location_id: 'dest', departure_location_ids: ['origin'],
                        arrival_time: new Date().toISOString(), travel_time: 3600, transportation: { type: 'driving' },
                        properties: ['travel_time', 'distance']
                    }]
                })
            });
            const data = await response.json();
            const duration = data.results?.[0]?.locations?.[0]?.properties?.[0]?.travel_time || 1800;
            return json(
                { success: true, duration: Math.round(duration / 60) },
                { headers: corsHeaders }
            );
        }

        // --- WEICHE: PDF Generierung ---
        const { userName, period, reports, totalSum, companyId } = body;

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 40
        });

        const chunks: Uint8Array[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));

        // --- Header ---
        doc.fontSize(20).font('Helvetica-Bold').text('REISEKOSTENABRECHNUNG', { align: 'left' });
        doc.fontSize(10).font('Helvetica').text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, { align: 'right' });
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text(`Mitarbeiter: ${userName}`);
        doc.fontSize(12).font('Helvetica').text(`Zeitraum: ${period}`);
        doc.moveDown(2);

        // --- Tabellen-Header ---
        const tableTop = 160;
        const colDate = 40;
        const colTimes = 95;
        const colDest = 175;
        const colPurpose = 320;
        const colAbsence = 465;
        const colVMA = 545;
        const colHotel = 625;
        const colTotal = 715;

        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Datum', colDate, tableTop);
        doc.text('Zeitraum', colTimes, tableTop);
        doc.text('Ziel', colDest, tableTop);
        doc.text('Zweck', colPurpose, tableTop);
        doc.text('Abwesend', colAbsence, tableTop);
        doc.text('VMA (€)', colVMA, tableTop);
        doc.text('Übern. (€)', colHotel, tableTop);
        doc.text('Gesamt', colTotal, tableTop);

        doc.moveTo(40, tableTop + 15).lineTo(760, tableTop + 15).stroke();

        // --- Zeilen ---
        let currentY = tableTop + 25;
        doc.font('Helvetica').fontSize(8);

        for (const r of reports) {
            const destinationText = r.destination || '';
            const purposeText = r.purpose || '';
            
            // Dynamische Zeilenhöhe berechnen (mit ausreichend Padding)
            const destWidth = colPurpose - colDest - 10;
            const purposeWidth = colAbsence - colPurpose - 10;
            const destHeight = doc.heightOfString(destinationText, { width: destWidth });
            const purposeHeight = doc.heightOfString(purposeText, { width: purposeWidth });
            const rowHeight = Math.max(destHeight + 20, purposeHeight + 20, 35);

            // Automatischer Seitenumbruch
            if (currentY + rowHeight > 540) {
                doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
                currentY = 40;
            }

            const vOffset = 8; // Vertikales Padding

            doc.text(r.date, colDate, currentY + vOffset);
            doc.text(r.times, colTimes, currentY + vOffset);
            doc.text(destinationText, colDest, currentY + vOffset, { width: destWidth });
            doc.text(purposeText, colPurpose, currentY + vOffset, { width: purposeWidth });
            doc.text(r.absence, colAbsence, currentY + vOffset);
            doc.text(r.perDiem, colVMA, currentY + vOffset, { align: 'right', width: 60 });
            doc.text(r.accommodation, colHotel, currentY + vOffset, { align: 'right', width: 60 });
            doc.font('Helvetica-Bold').text(r.total, colTotal, currentY + vOffset, { align: 'right', width: 70 }).font('Helvetica');

            // Linie nach jeder Zeile
            doc.moveTo(40, currentY + rowHeight - 5).lineTo(760, currentY + rowHeight - 5).opacity(0.2).stroke().opacity(1);
            currentY += rowHeight;
        }

        // --- Gesamt-Summe ---
        currentY += 10;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Auszahlungsbetrag Gesamt:', 545, currentY);
        doc.fillColor('#4f46e5').text(totalSum, colTotal, currentY, { align: 'right', width: 70 });

        doc.end();

        const buffer = await new Promise<Buffer>((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });

        // --- PDF in PocketBase Company hinterlegen ---
        const authHeader = request.headers.get('Authorization');
        if (authHeader && companyId) {
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('pdf', new Blob([new Uint8Array(buffer)], { type: 'application/pdf' }), `VMA_${userName.replace(/\s/g, '_')}_${period.replace(/\s/g, '_')}.pdf`);
                
                await fetch(`${process.env.POCKETBASE_URL || 'http://localhost:8090'}/api/collections/company/records/${companyId}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': authHeader },
                    body: uploadFormData
                });
            } catch (err) {
                console.error('PB Upload Error:', err);
            }
        }

        return new Response(new Uint8Array(buffer), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Reisekosten.pdf"`
            }
        });

    } catch (err: any) {
        console.error('PDF Server Error:', err);
        return json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
};