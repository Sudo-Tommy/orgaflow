/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2109439135");

  // check if field already exists
  let hasReceipt = false;
  try {
    const existing = collection.fields.getByName("receipt");
    if (existing) hasReceipt = true;
  } catch (e) {
    hasReceipt = false;
  }

  if (!hasReceipt) {
    collection.fields.add(new Field({
      "autogeneratePattern": "",
      "help": "Beleg oder Quittung zur Sonderausgabe",
      "hidden": false,
      "id": "file_exp_receipt",
      "maxSelect": 1,
      "maxSize": 10485760,
      "mimeTypes": [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "application/pdf"
      ],
      "name": "receipt",
      "presentable": false,
      "protected": false,
      "required": false,
      "system": false,
      "thumbs": [
        "100x100"
      ],
      "type": "file"
    }));
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2109439135");
  try {
    collection.fields.removeById("file_exp_receipt");
  } catch (e) {}
  return app.save(collection);
});
