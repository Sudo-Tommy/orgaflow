import sqlite3
import json
import jwt
import requests

conn = sqlite3.connect('s:/OrgaFlow_Alpha/backend/pb_data/data.db')
c = conn.cursor()
c.execute('SELECT value FROM _params WHERE id="settings"')
settings = json.loads(c.fetchone()[0])
secret = settings.get('recordAuthToken', {}).get('secret')

c.execute('SELECT id, tokenKey, email FROM users WHERE name_first="Doreen"')
user = c.fetchone()
print("Doreen ID:", user[0], "tokenKey:", user[1])

# Generate PocketBase JWT
# PocketBase record token payload:
payload = {
    "id": user[0],
    "type": "auth",
    "collectionId": "_pb_users_auth_",
    "tokenKey": user[1]
}

token = jwt.encode(payload, secret, algorithm="HS256")
print("Generated Token:", token[:25] + "...")

# Test GET /api/collections/invoices/records
res = requests.get('http://127.0.0.1:8090/api/collections/invoices/records?perPage=10', headers={
    'Authorization': token
})

print("Response status:", res.status_code)
if res.status_code == 200:
    data = res.json()
    print("SUCCESS! Invoices returned for Doreen:", data.get('totalItems'))
    for item in data.get('items', [])[:3]:
        print(" - Invoice:", item.get('invoice_nr'), "User:", item.get('user'), "Company:", item.get('company'))
else:
    print("Failed:", res.text)
