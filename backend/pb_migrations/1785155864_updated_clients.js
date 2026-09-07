/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // add field
  collection.fields.addAt(34, new Field({
    "help": "",
    "hidden": false,
    "id": "number888770115",
    "max": null,
    "min": null,
    "name": "sum_entlastungsleistungen",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(35, new Field({
    "help": "",
    "hidden": false,
    "id": "number597652358",
    "max": null,
    "min": null,
    "name": "restbudget_vorjahr",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // remove field
  collection.fields.removeById("number888770115")

  // remove field
  collection.fields.removeById("number597652358")

  return app.save(collection)
})
