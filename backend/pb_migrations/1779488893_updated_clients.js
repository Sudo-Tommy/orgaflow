/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update field
  collection.fields.addAt(27, new Field({
    "help": "",
    "hidden": false,
    "id": "file2729472648",
    "maxSelect": 10,
    "maxSize": 0,
    "mimeTypes": null,
    "name": "documents",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update field
  collection.fields.addAt(27, new Field({
    "help": "",
    "hidden": false,
    "id": "file2729472648",
    "maxSelect": 10,
    "maxSize": 471859200,
    "mimeTypes": null,
    "name": "documents",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
})
