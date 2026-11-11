/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq");

  let hasField = false;
  try {
    const existing = collection.fields.getByName("billing_type");
    if (existing) hasField = true;
  } catch (e) {
    hasField = false;
  }

  if (!hasField) {
    collection.fields.add(new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "select_app_billing_type",
      "maxSelect": 1,
      "name": "billing_type",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "select",
      "values": [
        "EL",
        "VHP",
        "Kombi",
        "Privat"
      ]
    }));
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq");
  try {
    collection.fields.removeById("select_app_billing_type");
  } catch (e) {}
  return app.save(collection);
});
