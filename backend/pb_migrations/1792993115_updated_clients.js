/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // add field
  collection.fields.addAt(50, new Field({
    "help": "",
    "hidden": false,
    "id": "number1197237624",
    "max": null,
    "min": null,
    "name": "annual_budget_entlastung",
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
  collection.fields.removeById("number1197237624")

  return app.save(collection)
})
