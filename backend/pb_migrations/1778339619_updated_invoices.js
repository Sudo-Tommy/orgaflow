/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // remove field
  collection.fields.removeById("relation3814860174")

  // add field
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
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // add field
  collection.fields.addAt(18, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2473931125",
    "help": "",
    "hidden": false,
    "id": "relation3814860174",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "spendings",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // remove field
  collection.fields.removeById("relation239398109")

  return app.save(collection)
})
