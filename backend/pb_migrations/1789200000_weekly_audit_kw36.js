/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. personal_transactions: Add status, is_storno, storno_reason and update API rules to include admin role
  try {
    const pt = app.findCollectionByNameOrId("pbc_528246199");
    if (pt) {
      if (!pt.fields.getByName("status")) {
        pt.fields.addAt(pt.fields.length, new Field({
          "help": "Transaktionsstatus (gebucht, storniert, ausstehend)",
          "hidden": false,
          "id": "select_pt_status",
          "maxSelect": 1,
          "name": "status",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": ["gebucht", "storniert", "ausstehend"]
        }));
      }

      if (!pt.fields.getByName("is_storno")) {
        pt.fields.addAt(pt.fields.length, new Field({
          "help": "Kennzeichnung als GoBD-konforme Storno-Buchung",
          "hidden": false,
          "id": "bool_pt_is_storno",
          "name": "is_storno",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        }));
      }

      if (!pt.fields.getByName("storno_reason")) {
        pt.fields.addAt(pt.fields.length, new Field({
          "autogeneratePattern": "",
          "help": "Begründung für die Stornierung",
          "hidden": false,
          "id": "text_pt_storno_reason",
          "max": 500,
          "min": 0,
          "name": "storno_reason",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }));
      }

      const ptRule = 'user = @request.auth.id || @request.auth.role = "admin" || @request.auth.role = "superadmin"';
      unmarshal({
        "createRule": ptRule,
        "deleteRule": ptRule,
        "listRule": ptRule,
        "updateRule": ptRule,
        "viewRule": ptRule
      }, pt);

      app.save(pt);
    }
  } catch (e) {
    console.log("Migration personal_transactions skipped or error:", e);
  }

  // 2. personal_contracts: Update API rules to include admin role
  try {
    const pc = app.findCollectionByNameOrId("pbc_1825670003");
    if (pc) {
      const pcRule = 'user = @request.auth.id || @request.auth.role = "admin" || @request.auth.role = "superadmin"';
      unmarshal({
        "createRule": pcRule,
        "deleteRule": pcRule,
        "listRule": pcRule,
        "updateRule": pcRule,
        "viewRule": pcRule
      }, pc);

      app.save(pc);
    }
  } catch (e) {
    console.log("Migration personal_contracts skipped or error:", e);
  }

  // 3. audit_logs: Allow authenticated clients to create logs, and admin/superadmin to view
  try {
    const auditLogs = app.findCollectionByNameOrId("pbc_693723036");
    if (auditLogs) {
      unmarshal({
        "createRule": "@request.auth.id != ''",
        "deleteRule": '@request.auth.role = "superadmin"',
        "listRule": '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
        "updateRule": null,
        "viewRule": '@request.auth.role = "admin" || @request.auth.role = "superadmin"'
      }, auditLogs);

      app.save(auditLogs);
    }
  } catch (e) {
    console.log("Migration audit_logs skipped or error:", e);
  }

  // 4. document_templates: Ensure clean RBAC rules
  try {
    const docTemplates = app.findCollectionByNameOrId("pbc_389921221");
    if (docTemplates) {
      unmarshal({
        "createRule": '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
        "deleteRule": '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
        "listRule": "@request.auth.id != ''",
        "updateRule": '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
        "viewRule": "@request.auth.id != ''"
      }, docTemplates);

      app.save(docTemplates);
    }
  } catch (e) {
    console.log("Migration document_templates skipped or error:", e);
  }
}, (app) => {
  // Rollback logic
  try {
    const pt = app.findCollectionByNameOrId("pbc_528246199");
    if (pt) {
      pt.fields.removeById("select_pt_status");
      pt.fields.removeById("bool_pt_is_storno");
      pt.fields.removeById("text_pt_storno_reason");
      app.save(pt);
    }
  } catch (e) {}
});
