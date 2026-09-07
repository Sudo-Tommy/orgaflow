/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3737793858");

  // check if field already exists (e.g. from runtime migration)
  let hasStatus = false;
  try {
    const existing = collection.fields.getByName("status");
    if (existing) hasStatus = true;
  } catch (e) {
    hasStatus = false;
  }

  if (!hasStatus) {
    collection.fields.add(new Field({
      "hidden": false,
      "id": "select_chat_status",
      "maxSelect": 1,
      "name": "status",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "select",
      "values": [
        "Neu",
        "In Bearbeitung",
        "Gelöst",
        "Archiviert"
      ]
    }));
  }

  // Ensure update rule allows admins and superadmins
  collection.updateRule = "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3737793858");
  try {
    collection.fields.removeById("select_chat_status");
  } catch (e) {}
  return app.save(collection);
});
