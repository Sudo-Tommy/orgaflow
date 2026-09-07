/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // add field
  collection.fields.addAt(14, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1930317162",
    "help": "",
    "hidden": false,
    "id": "relation819702165",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "appointment_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // remove field
  collection.fields.removeById("relation819702165")

  return app.save(collection)
})
