/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // add field
  collection.fields.addAt(25, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_389921221",
    "help": "",
    "hidden": false,
    "id": "relation2286437851",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "invoice_template",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_389921221",
    "help": "",
    "hidden": false,
    "id": "relation2149446031",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "time_record_template",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(27, new Field({
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

  // add field
  collection.fields.addAt(28, new Field({
    "help": "",
    "hidden": false,
    "id": "number3831260122",
    "max": null,
    "min": null,
    "name": "km_rate",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(29, new Field({
    "help": "",
    "hidden": false,
    "id": "bool493607096",
    "name": "group_drive_records",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // update field
  collection.fields.addAt(20, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3332084752",
    "help": "",
    "hidden": false,
    "id": "relation2729472648",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "invoices",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // remove field
  collection.fields.removeById("relation2286437851")

  // remove field
  collection.fields.removeById("relation2149446031")

  // remove field
  collection.fields.removeById("number3278057665")

  // remove field
  collection.fields.removeById("number3831260122")

  // remove field
  collection.fields.removeById("bool493607096")

  // update field
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

  return app.save(collection)
})
