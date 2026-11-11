/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // add field
  collection.fields.addAt(35, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1651271980",
    "max": 0,
    "min": 0,
    "name": "pickup_address",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(36, new Field({
    "help": "",
    "hidden": false,
    "id": "file2729472648",
    "maxSelect": 50,
    "maxSize": 52428800,
    "mimeTypes": [],
    "name": "documents",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  // add field
  collection.fields.addAt(37, new Field({
    "help": "",
    "hidden": false,
    "id": "number3804156586",
    "max": null,
    "min": null,
    "name": "route_distance",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(38, new Field({
    "help": "",
    "hidden": false,
    "id": "number2020853995",
    "max": null,
    "min": null,
    "name": "route_duration",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // remove field
  collection.fields.removeById("text1651271980")

  // remove field
  collection.fields.removeById("file2729472648")

  // remove field
  collection.fields.removeById("number3804156586")

  // remove field
  collection.fields.removeById("number2020853995")

  return app.save(collection)
})
