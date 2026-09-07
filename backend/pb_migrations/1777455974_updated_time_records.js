/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "file250665868",
    "maxSelect": 0,
    "maxSize": 0,
    "mimeTypes": null,
    "name": "pdf",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // remove field
  collection.fields.removeById("file250665868")

  return app.save(collection)
})
