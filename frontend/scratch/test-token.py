import sqlite3
import json

conn = sqlite3.connect('s:/OrgaFlow_Alpha/backend/pb_data/data.db')
c = conn.cursor()
c.execute('SELECT key, value FROM _params WHERE key="settings"')
row = c.fetchone()
if row:
    settings = json.loads(row[1])
    # print token secrets
    print("RecordAuthToken secret:", settings.get('recordAuthToken', {}).get('secret', '')[:10] + '...')
