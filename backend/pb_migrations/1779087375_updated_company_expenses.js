/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_577657011")

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2603248766",
    "max": 0,
    "min": 0,
    "name": "supplier",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2451362411",
    "max": 0,
    "min": 0,
    "name": "invoice_nr",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "number696138167",
    "max": null,
    "min": null,
    "name": "netto",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "number735249692",
    "max": null,
    "min": null,
    "name": "tax_sum",
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
    "id": "number3278057665",
    "max": null,
    "min": null,
    "name": "tax_rate",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_577657011")

  // remove field
  collection.fields.removeById("text2603248766")

  // remove field
  collection.fields.removeById("text2451362411")

  // remove field
  collection.fields.removeById("number696138167")

  // remove field
  collection.fields.removeById("number735249692")

  // remove field
  collection.fields.removeById("number3278057665")

  return app.save(collection)
})
