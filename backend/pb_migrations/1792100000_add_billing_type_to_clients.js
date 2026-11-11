/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8");

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
      "id": "select_client_billing_type",
      "maxSelect": 1,
      "name": "billing_type",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "select",
      "values": [
        "45a",
        "EL",
        "Kombi",
        "Privat",
        "VHP"
      ]
    }));
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8");
  try {
    collection.fields.removeById("select_client_billing_type");
  } catch (e) {}
  return app.save(collection);
});
