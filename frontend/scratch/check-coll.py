import sqlite3
import json

conn = sqlite3.connect('s:/OrgaFlow_Alpha/backend/pb_data/data.db')
c = conn.cursor()
c.execute('SELECT * FROM _collections WHERE name="users"')
row = c.fetchone()
cols = [d[0] for d in c.description]
data = dict(zip(cols, row))
for k, v in data.items():
    if k != 'fields':
        print(f"{k}: {v}")
