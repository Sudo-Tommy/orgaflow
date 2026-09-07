import PocketBase from 'pocketbase';
import jwt from 'jsonwebtoken'; // or we can generate a valid token using pocketbase or verify with pb
import sqlite3 from 'sqlite3';

const conn = new sqlite3.Database('s:/OrgaFlow_Alpha/backend/pb_data/data.db');

conn.get('SELECT id, email, tokenKey FROM users WHERE name_first="Doreen"', async (err, row) => {
    if (err || !row) {
        console.error("Could not find Doreen:", err);
        return;
    }

    console.log("Found Doreen:", row);

    // Let's test using PocketBase SDK with admin auth or user auth
    const pb = new PocketBase('http://127.0.0.1:8090');
    
    // We can query PocketBase using admin token from superuser or test auth
    conn.get('SELECT id, email, tokenKey FROM _superusers LIMIT 1', async (err2, su) => {
        console.log("Superuser:", su?.email);
    });
});
