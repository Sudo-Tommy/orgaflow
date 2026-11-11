/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2269083802");

  // Multi-File Feld für Anhänge, Dokumente & Screenshots aus dem Support-Chat
  collection.fields.add(new Field({
    "help": "Anhänge und Dateien aus dem Omni-Support-Chat",
    "hidden": false,
    "id": "file_support_attachments",
    "maxSelect": 5,
    "maxSize": 26214400,
    "mimeTypes": [],
    "name": "attachments",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2269083802");
  collection.fields.removeById("file_support_attachments");
  return app.save(collection);
});

