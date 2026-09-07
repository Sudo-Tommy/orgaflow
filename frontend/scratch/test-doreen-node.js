import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';

const db = new sqlite3.Database('s:/OrgaFlow_Alpha/backend/pb_data/data.db');

db.get('SELECT value FROM _params WHERE id="settings"', (err, row) => {
    const settings = JSON.parse(row.value);
    const secret = settings.recordAuthToken?.secret;

    db.get('SELECT id, tokenKey, email FROM users WHERE name_first="Doreen"', async (err2, user) => {
        console.log("Doreen ID:", user.id);

        const payload = {
            id: user.id,
            type: "auth",
            collectionId: "_pb_users_auth_",
            tokenKey: user.tokenKey
        };

        const token = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '7d' });
        console.log("Generated Token:", token.slice(0, 30) + '...');

        const res = await fetch('http://127.0.0.1:8090/api/collections/invoices/records?perPage=10', {
            headers: { 'Authorization': token }
        });

        console.log("Response status:", res.status);
        const data = await res.json();
        if (res.ok) {
            console.log("SUCCESS! Invoices returned for Doreen:", data.totalItems);
            console.log("Sample:", data.items.slice(0, 3).map(i => ({ nr: i.invoice_nr, user: i.user, comp: i.company })));
        } else {
            console.error("Failed:", data);
        }
        db.close();
    });
});
