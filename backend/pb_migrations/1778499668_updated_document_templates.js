/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_389921221")

  // remove field
  collection.fields.removeById("bool4116874775")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_389921221")

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "bool4116874775",
    "name": "is_default",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})
