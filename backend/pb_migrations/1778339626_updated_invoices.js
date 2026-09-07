/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // update field
  collection.fields.addAt(21, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2109439135",
    "help": "",
    "hidden": false,
    "id": "relation239398109",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "spendings",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // update field
  collection.fields.addAt(21, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2109439135",
    "help": "",
    "hidden": false,
    "id": "relation239398109",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "spending",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
