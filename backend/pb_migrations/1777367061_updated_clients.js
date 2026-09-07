/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // add field
  collection.fields.addAt(17, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_281905539",
    "help": "",
    "hidden": false,
    "id": "relation1678683980",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "insurance",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // remove field
  collection.fields.removeById("relation1678683980")

  return app.save(collection)
})
