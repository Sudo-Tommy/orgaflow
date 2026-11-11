/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq");

  let hasStatus = false;
  try {
    const existing = collection.fields.getByName("status");
    if (existing) hasStatus = true;
  } catch (e) {
    hasStatus = false;
  }

  if (!hasStatus) {
    collection.fields.add(new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "select_app_status",
      "maxSelect": 1,
      "name": "status",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "select",
      "values": [
        "geplant",
        "abgesagt"
      ]
    }));
  }

  let hasReason = false;
  try {
    const existing = collection.fields.getByName("cancellation_reason");
    if (existing) hasReason = true;
  } catch (e) {
    hasReason = false;
  }

  if (!hasReason) {
    collection.fields.add(new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "text_app_cancellation_reason",
      "max": 0,
      "min": 0,
      "name": "cancellation_reason",
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }));
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq");
  try {
    collection.fields.removeById("select_app_status");
  } catch (e) {}
  try {
    collection.fields.removeById("text_app_cancellation_reason");
  } catch (e) {}
  return app.save(collection);
});
