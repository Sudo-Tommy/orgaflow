/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // update field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_2880842635",
    "help": "",
    "hidden": false,
    "id": "relation1071965820",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "drive_record",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": true,
    "collectionId": "6jk3q2mfkm8g415",
    "help": "",
    "hidden": false,
    "id": "relation3267547239",
    "maxSelect": 10,
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

  // update field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2880842635",
    "help": "",
    "hidden": false,
    "id": "relation1071965820",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "drive_record",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "6jk3q2mfkm8g415",
    "help": "",
    "hidden": false,
    "id": "relation3267547239",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "time_record",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
