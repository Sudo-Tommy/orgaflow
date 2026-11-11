/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const appointmentsCollection = app.findCollectionByNameOrId("oxbqk37n877m8bq");
  const invoicesCollection = app.findCollectionByNameOrId("pbc_3332084752");

  const hasField = (col, name) => {
    try {
      return !!col.fields.getByName(name);
    } catch (e) {
      return false;
    }
  };

  if (!hasField(appointmentsCollection, "remaining_amount")) {
    appointmentsCollection.fields.add(new Field({
      "hidden": false,
      "id": "num_app_remaining_amount",
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

  if (!hasField(appointmentsCollection, "already_paid_amount")) {
    appointmentsCollection.fields.add(new Field({
      "hidden": false,
      "id": "num_app_already_paid_amount",
      "max": null,
      "min": null,
      "name": "already_paid_amount",
      "onlyInt": false,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }));
  }

  if (!hasField(appointmentsCollection, "original_amount")) {
    appointmentsCollection.fields.add(new Field({
      "hidden": false,
      "id": "num_app_original_amount",
      "max": null,
      "min": null,
      "name": "original_amount",
      "onlyInt": false,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }));
  }

  if (!hasField(appointmentsCollection, "parent_invoice")) {
    appointmentsCollection.fields.add(new Field({
      "cascadeDelete": false,
      "collectionId": invoicesCollection.id,
      "hidden": false,
      "id": "rel_app_parent_invoice",
      "maxSelect": 1,
      "minSelect": 0,
      "name": "parent_invoice",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    }));
  }

  return app.save(appointmentsCollection);
}, (app) => {
  const appointmentsCollection = app.findCollectionByNameOrId("oxbqk37n877m8bq");
  try { appointmentsCollection.fields.removeById("num_app_remaining_amount"); } catch(e) {}
  try { appointmentsCollection.fields.removeById("num_app_already_paid_amount"); } catch(e) {}
  try { appointmentsCollection.fields.removeById("num_app_original_amount"); } catch(e) {}
  try { appointmentsCollection.fields.removeById("rel_app_parent_invoice"); } catch(e) {}
  return app.save(appointmentsCollection);
});
