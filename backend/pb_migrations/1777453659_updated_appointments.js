/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2880842635",
    "help": "",
    "hidden": false,
    "id": "relation1071965820",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "drive_record",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "6jk3q2mfkm8g415",
    "help": "",
    "hidden": false,
    "id": "relation3267547239",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "time_record",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // remove field
  collection.fields.removeById("relation1071965820")

  // remove field
  collection.fields.removeById("relation3267547239")

  return app.save(collection)
})
