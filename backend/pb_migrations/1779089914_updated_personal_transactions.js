/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_528246199")

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "bool2584864696",
    "name": "is_installment",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "number1653915095",
    "max": null,
    "min": null,
    "name": "installment_amount",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "number184670064",
    "max": null,
    "min": null,
    "name": "installment_total_count",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_528246199")

  // remove field
  collection.fields.removeById("bool2584864696")

  // remove field
  collection.fields.removeById("number1653915095")

  // remove field
  collection.fields.removeById("number184670064")

  return app.save(collection)
})
