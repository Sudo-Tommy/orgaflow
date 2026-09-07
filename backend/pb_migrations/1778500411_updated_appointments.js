/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // add field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "ij5c2dvndh6ol26",
    "help": "",
    "hidden": false,
    "id": "relation1347970455",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "tasks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // remove field
  collection.fields.removeById("relation1347970455")

  return app.save(collection)
})
