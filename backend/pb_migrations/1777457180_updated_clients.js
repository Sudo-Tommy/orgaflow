/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // add field
  collection.fields.addAt(18, new Field({
    "cascadeDelete": false,
    "collectionId": "oxbqk37n877m8bq",
    "help": "",
    "hidden": false,
    "id": "relation1782674042",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "appointments",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(19, new Field({
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

  // add field
  collection.fields.addAt(20, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3332084752",
    "help": "",
    "hidden": false,
    "id": "relation2729472648",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "documents",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_16898637",
    "help": "",
    "hidden": false,
    "id": "relation3146634886",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "retirement_home",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // remove field
  collection.fields.removeById("relation1782674042")

  // remove field
  collection.fields.removeById("relation859837811")

  // remove field
  collection.fields.removeById("relation2729472648")

  // remove field
  collection.fields.removeById("relation3146634886")

  return app.save(collection)
})
