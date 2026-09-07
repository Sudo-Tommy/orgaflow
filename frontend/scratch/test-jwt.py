import sqlite3
import json
import base64
import hmac
import hashlib
import urllib.request
import time

conn = sqlite3.connect('s:/OrgaFlow_Alpha/backend/pb_data/data.db')
c = conn.cursor()

c.execute('SELECT options FROM _collections WHERE name="users"')
opts = json.loads(c.fetchone()[0])
secret = opts['authToken']['secret'].encode('utf-8')

c.execute('SELECT id, tokenKey, email FROM users WHERE name_first="Doreen"')
user = c.fetchone()
print(f"Testing for user: {user[2]} (ID: {user[0]})")

def b64url(data):
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode('utf-8'))
payload = b64url(json.dumps({
    "id": user[0],
    "type": "auth",
    "collectionId": "_pb_users_auth_",
    "tokenKey": user[1],
    "exp": int(time.time()) + 3600
}).encode('utf-8'))

sig_input = f"{header}.{payload}".encode('utf-8')
sig = b64url(hmac.new(secret, sig_input, hashlib.sha256).digest())
token = f"{header}.{payload}.{sig}"

req = urllib.request.Request('http://127.0.0.1:8090/api/collections/invoices/records?perPage=10', headers={
    'Authorization': token
})

try:
    with urllib.request.urlopen(req) as resp:
        print("HTTP STATUS:", resp.status)
        data = json.loads(resp.read().decode('utf-8'))
        print(f"SUCCESS! Total invoices visible to Doreen: {data.get('totalItems')}")
        for item in data.get('items', [])[:5]:
            print(f" - {item.get('invoice_nr')} | User: {item.get('user')} | Comp: {item.get('company')}")
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode('utf-8'))
