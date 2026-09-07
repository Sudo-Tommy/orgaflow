import sqlite3

conn = sqlite3.connect('s:/OrgaFlow_Alpha/backend/pb_data/data.db')
c = conn.cursor()
c.execute('SELECT listRule, viewRule, createRule, updateRule, deleteRule FROM _collections WHERE name="invoices"')
row = c.fetchone()
print("ListRule:  ", row[0])
print("ViewRule:  ", row[1])
print("CreateRule:", row[2])
print("UpdateRule:", row[3])
print("DeleteRule:", row[4])
