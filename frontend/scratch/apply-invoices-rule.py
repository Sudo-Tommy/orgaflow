import sqlite3

conn = sqlite3.connect('s:/OrgaFlow_Alpha/backend/pb_data/data.db')
c = conn.cursor()

new_rule = 'user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = "admin" || @request.auth.role = "superadmin"'

c.execute('''
    UPDATE _collections 
    SET listRule = ?, viewRule = ?, createRule = ?, updateRule = ?, deleteRule = ?
    WHERE name = "invoices"
''', (new_rule, new_rule, new_rule, new_rule, new_rule))

conn.commit()

c.execute('SELECT listRule, viewRule, createRule, updateRule, deleteRule FROM _collections WHERE name="invoices"')
row = c.fetchone()
print("Updated Invoices Rules successfully:")
print("ListRule:  ", row[0])
print("ViewRule:  ", row[1])
print("CreateRule:", row[2])
print("UpdateRule:", row[3])
print("DeleteRule:", row[4])
conn.close()
