/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ij5c2dvndh6ol26")

  // remove field
  collection.fields.removeById("relation3267547239")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("ij5c2dvndh6ol26")

  // add field
  collection.fields.addAt(3, new Field({
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
})
