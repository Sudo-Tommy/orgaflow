/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2880842635")

  // remove field
  collection.fields.removeById("relation4265146436")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2880842635")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "oxbqk37n877m8bq",
    "help": "",
    "hidden": false,
    "id": "relation4265146436",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "appointment",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
