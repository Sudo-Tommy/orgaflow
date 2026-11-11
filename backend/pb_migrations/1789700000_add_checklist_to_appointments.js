/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq");

  let hasField = false;
  try {
    const existing = collection.fields.getByName("checklist");
    if (existing) hasField = true;
  } catch (e) {
    hasField = false;
  }

  if (!hasField) {
    collection.fields.add(new Field({
      "hidden": false,
      "id": "json_app_checklist",
      "maxSize": 2000000,
      "name": "checklist",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "json"
    }));
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq");
  try {
    collection.fields.removeById("json_app_checklist");
  } catch (e) {}
  return app.save(collection);
});
