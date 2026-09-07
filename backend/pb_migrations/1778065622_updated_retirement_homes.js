/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_16898637")

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "hu9womf4xnkbrk8",
    "help": "",
    "hidden": false,
    "id": "relation13119092",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "clients",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(6, new Field({
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
  const collection = app.findCollectionByNameOrId("pbc_16898637")

  // remove field
  collection.fields.removeById("relation13119092")

  // remove field
  collection.fields.removeById("relation859837811")

  return app.save(collection)
})
