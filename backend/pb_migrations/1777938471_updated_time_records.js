/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2880842635",
    "help": "",
    "hidden": false,
    "id": "relation1115821818",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "drive_records",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // remove field
  collection.fields.removeById("relation1115821818")

  return app.save(collection)
})
