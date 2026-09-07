/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // remove field
  collection.fields.removeById("relation2370461675")

  // add field
  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2109439135",
    "help": "",
    "hidden": false,
    "id": "relation744210084",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "expenditures",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // add field
  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3332084752",
    "help": "",
    "hidden": false,
    "id": "relation2370461675",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "expenditure",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // remove field
  collection.fields.removeById("relation744210084")

  return app.save(collection)
})
