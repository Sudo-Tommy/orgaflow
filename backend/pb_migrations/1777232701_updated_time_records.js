/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // add field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "ij5c2dvndh6ol26",
    "help": "",
    "hidden": false,
    "id": "relation1397647488",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "work",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // remove field
  collection.fields.removeById("relation1397647488")

  return app.save(collection)
})
