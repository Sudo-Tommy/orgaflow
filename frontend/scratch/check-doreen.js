import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function checkDoreen() {
    try {
        // Let's check users
        // Since admin auth might be needed, let's see if we can get collections or records
        const users = await pb.collection('users').getFullList({
            filter: 'name_first ~ "Doreen" || name_last ~ "Jenzsch" || username ~ "doreen"'
        }).catch(err => {
            console.log("Could not fetch users directly:", err.message);
            return [];
        });

        console.log("Users found:", users.map(u => ({
            id: u.id,
            username: u.username,
            name_first: u.name_first,
            name_last: u.name_last,
            role: u.role,
            company: u.company
        })));

        const companies = await pb.collection('company').getFullList().catch(err => {
            console.log("Could not fetch companies directly:", err.message);
            return [];
        });

        console.log("Companies found:", companies.map(c => ({
            id: c.id,
            name: c.name,
            users: c.users
        })));

        const invoices = await pb.collection('invoices').getList(1, 10).catch(err => {
            console.log("Could not fetch invoices directly:", err.message);
            return null;
        });

        if (invoices) {
            console.log(`Invoices total: ${invoices.totalItems}`);
            console.log("Sample invoices:", invoices.items.map(i => ({
                id: i.id,
                invoice_nr: i.invoice_nr,
                user: i.user,
                company: i.company,
                client: i.client
            })));
        }
    } catch (e) {
        console.error("Error in checkDoreen:", e);
    }
}

checkDoreen();
