import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function testDoreenInvoices() {
    try {
        // Let's authenticate as Doreen or simulate her query
        // First check collection listRule
        const collections = await pb.send('/api/collections/invoices', { method: 'GET' });
        console.log("Invoices collection listRule:", collections.listRule);
        console.log("Invoices collection viewRule:", collections.viewRule);

        // Check company users field for kdk6xmefbl5f4fv
        const doreenCompany = await pb.collection('company').getOne('kdk6xmefbl5f4fv');
        console.log("Doreen Company:", doreenCompany.name, "users:", doreenCompany.users);

        // Check how many invoices have company = 'kdk6xmefbl5f4fv' or user = 'wtchhhis4nlsjf3'
        const allInvoices = await pb.collection('invoices').getFullList();
        const doreenInvoices = allInvoices.filter(i => i.company === 'kdk6xmefbl5f4fv' || i.user === 'wtchhhis4nlsjf3');
        console.log(`Total invoices: ${allInvoices.length}, Doreen invoices: ${doreenInvoices.length}`);
        
        // Let's inspect the expand on client and company for Doreen's invoices
        for (const inv of doreenInvoices.slice(0, 3)) {
            console.log("Invoice:", inv.invoice_nr, "user:", inv.user, "company:", inv.company, "client:", inv.client);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testDoreenInvoices();
