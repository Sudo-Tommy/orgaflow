/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "file3320423381",
    "maxSelect": 10,
    "maxSize": 0,
    "mimeTypes": null,
    "name": "voice_records",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "convertURLs": false,
    "help": "",
    "hidden": false,
    "id": "editor4045383493",
    "maxSize": 0,
    "name": "reports",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "editor"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // remove field
  collection.fields.removeById("file3320423381")

  // remove field
  collection.fields.removeById("editor4045383493")

  return app.save(collection)
})
