/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Schema-Erweiterungen für 'invoices' (pbc_3332084752)
  const invoicesCollection = app.findCollectionByNameOrId("pbc_3332084752");
  const usersCollection = app.findCollectionByNameOrId("users");
  const clientsCollection = app.findCollectionByNameOrId("clients");

  // Helper zum sicheren Prüfen von Feldern
  const hasField = (col, name) => {
    try {
      return !!col.fields.getByName(name);
    } catch (e) {
      return false;
    }
  };

  if (!hasField(invoicesCollection, "dispute_hold")) {
    invoicesCollection.fields.add(new Field({
      "hidden": false,
      "id": "bool_inv_dispute_hold",
      "name": "dispute_hold",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "bool"
    }));
  }

  if (!hasField(invoicesCollection, "paid_amount")) {
    invoicesCollection.fields.add(new Field({
      "hidden": false,
      "id": "num_inv_paid_amount",
      "max": null,
      "min": null,
      "name": "paid_amount",
      "onlyInt": false,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }));
  }

  if (!hasField(invoicesCollection, "remaining_amount")) {
    invoicesCollection.fields.add(new Field({
      "hidden": false,
      "id": "num_inv_remaining_amount",
      "max": null,
      "min": null,
      "name": "remaining_amount",
      "onlyInt": false,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }));
  }

  if (!hasField(invoicesCollection, "write_off_amount")) {
    invoicesCollection.fields.add(new Field({
      "hidden": false,
      "id": "num_inv_write_off_amount",
      "max": null,
      "min": null,
      "name": "write_off_amount",
      "onlyInt": false,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }));
  }

  if (!hasField(invoicesCollection, "write_off_reason")) {
    invoicesCollection.fields.add(new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "text_inv_write_off_reason",
      "max": 0,
      "min": 0,
      "name": "write_off_reason",
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }));
  }

  if (!hasField(invoicesCollection, "parent_invoice")) {
    invoicesCollection.fields.add(new Field({
      "cascadeDelete": false,
      "collectionId": invoicesCollection.id,
      "hidden": false,
      "id": "rel_inv_parent_invoice",
      "maxSelect": 1,
      "minSelect": 0,
      "name": "parent_invoice",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    }));
  }

  // Status-Feld in invoices prüfen und bei Bedarf um 'Teilweise bezahlt' ergänzen
  try {
    const statusField = invoicesCollection.fields.getByName("status");
    if (statusField && Array.isArray(statusField.values)) {
      let values = [...statusField.values];
      if (values.length === 1 && values[0].includes(",")) {
        // Kommagetrennte Liste
        const splitVals = values[0].split(",").map(s => s.trim());
        if (!splitVals.includes("Teilweise bezahlt")) {
          splitVals.push("Teilweise bezahlt");
          statusField.values = [splitVals.join(", ")];
        }
      } else if (!values.includes("Teilweise bezahlt")) {
        values.push("Teilweise bezahlt");
        statusField.values = values;
      }
    }
  } catch (e) {}

  app.save(invoicesCollection);

  // 2. Collection 'invoice_adjustments' erstellen (falls noch nicht vorhanden)
  let adjustmentsCol = null;
  try {
    adjustmentsCol = app.findCollectionByNameOrId("invoice_adjustments");
  } catch (e) {
    adjustmentsCol = null;
  }

  if (!adjustmentsCol) {
    adjustmentsCol = new Collection({
      name: "invoice_adjustments",
      type: "base",
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
      deleteRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
      fields: [
        {
          autogeneratePattern: "[a-z0-9]{15}",
          hidden: false,
          id: "text3208210256",
          max: 15,
          min: 15,
          name: "id",
          pattern: "^[a-z0-9]+$",
          presentable": false,
          primaryKey": true,
          required: true,
          system: true,
          type: "text"
        },
        {
          cascadeDelete: false,
          collectionId: invoicesCollection.id,
          hidden: false,
          id: "rel_adj_invoice",
          maxSelect: 1,
          minSelect: 1,
          name: "invoice",
          presentable": false,
          required: true,
          system: false,
          type: "relation"
        },
        {
          hidden: false,
          id: "sel_adj_action_type",
          maxSelect: 1,
          name: "action_type",
          presentable": false,
          required: true,
          system: false,
          type: "select",
          values: [
            "full_payment",
            "dispute",
            "bill_client_privat",
            "write_off"
          ]
        },
        {
          hidden: false,
          id: "num_adj_difference_amount",
          max: null,
          min: null,
          name: "difference_amount",
          onlyInt": false,
          presentable": false,
          required: false,
          system: false,
          type: "number"
        },
        {
          hidden: false,
          id: "num_adj_received_amount",
          max: null,
          min: null,
          name: "received_amount",
          onlyInt": false,
          presentable": false,
          required: false,
          system: false,
          type: "number"
        },
        {
          autogeneratePattern: "",
          hidden: false,
          id: "txt_adj_reference_nr",
          max: 0,
          min: 0,
          name: "reference_nr",
          pattern: "",
          presentable": false,
          primaryKey": false,
          required: false,
          system: false,
          type: "text"
        },
        {
          autogeneratePattern: "",
          hidden: false,
          id: "txt_adj_notes",
          max: 0,
          min: 0,
          name: "notes",
          pattern: "",
          presentable": false,
          primaryKey": false,
          required: false,
          system: false,
          type: "text"
        },
        {
          cascadeDelete: false,
          collectionId: usersCollection.id,
          hidden: false,
          id: "rel_adj_createdby",
          maxSelect: 1,
          minSelect: 0,
          name: "createdby",
          presentable": false,
          required: false,
          system: false,
          type: "relation"
        }
      ],
      indexes: []
    });
    app.save(adjustmentsCol);
  }

  // 3. Collection 'tasks' sicherstellen & erweitern
  let tasksCol = null;
  try {
    tasksCol = app.findCollectionByNameOrId("tasks");
  } catch (e) {
    tasksCol = null;
  }

  if (tasksCol) {
    if (!hasField(tasksCol, "title")) {
      tasksCol.fields.add(new Field({
        "autogeneratePattern": "",
        "hidden": false,
        "id": "txt_task_title",
        "max": 0,
        "min": 0,
        "name": "title",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      }));
    }

    if (!hasField(tasksCol, "description")) {
      tasksCol.fields.add(new Field({
        "autogeneratePattern": "",
        "hidden": false,
        "id": "txt_task_desc",
        "max": 0,
        "min": 0,
        "name": "description",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }));
    }

    if (!hasField(tasksCol, "due_date")) {
      tasksCol.fields.add(new Field({
        "hidden": false,
        "id": "dat_task_due_date",
        "max": "",
        "min": "",
        "name": "due_date",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      }));
    }

    if (!hasField(tasksCol, "status")) {
      tasksCol.fields.add(new Field({
        "hidden": false,
        "id": "sel_task_status",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "Offen",
          "In Bearbeitung",
          "Erledigt"
        ]
      }));
    }

    if (!hasField(tasksCol, "client")) {
      tasksCol.fields.add(new Field({
        "cascadeDelete": false,
        "collectionId": clientsCollection.id,
        "hidden": false,
        "id": "rel_task_client",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "client",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      }));
    }

    if (!hasField(tasksCol, "related_invoice")) {
      tasksCol.fields.add(new Field({
        "cascadeDelete": false,
        "collectionId": invoicesCollection.id,
        "hidden": false,
        "id": "rel_task_related_invoice",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "related_invoice",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      }));
    }

    app.save(tasksCol);
  }

  return null;
}, (app) => {
  // Revert optional/idempotent
  return null;
});
