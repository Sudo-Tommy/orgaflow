/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // add field
  collection.fields.addAt(24, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_16898637",
    "help": "",
    "hidden": false,
    "id": "relation527328456",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "retirement_homes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(25, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1930317162",
    "help": "",
    "hidden": false,
    "id": "relation859837811",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "contacts",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // remove field
  collection.fields.removeById("relation527328456")

  // remove field
  collection.fields.removeById("relation859837811")

  return app.save(collection)
})
