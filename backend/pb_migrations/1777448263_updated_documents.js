/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // add field
  collection.fields.addAt(11, new Field({
    "cascadeDelete": false,
    "collectionId": "6jk3q2mfkm8g415",
    "help": "",
    "hidden": false,
    "id": "relation3357210912",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "time_records",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // remove field
  collection.fields.removeById("relation3357210912")

  return app.save(collection)
})
