/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "select3278057665",
    "maxSelect": 0,
    "name": "tax_rate",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "7",
      "9",
      "19"
    ]
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "number2497787653",
    "max": null,
    "min": null,
    "name": "tax_before",
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
  collection.fields.addAt(19, new Field({
    "help": "",
    "hidden": false,
    "id": "number2279406108",
    "max": null,
    "min": null,
    "name": "hourly_wage",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(20, new Field({
    "help": "",
    "hidden": false,
    "id": "json1356630662",
    "maxSize": 0,
    "name": "table_positions",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "help": "",
    "hidden": false,
    "id": "json582293257",
    "maxSize": 0,
    "name": "table_sum_positions",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // remove field
  collection.fields.removeById("select3278057665")

  // remove field
  collection.fields.removeById("number2497787653")

  // remove field
  collection.fields.removeById("number735249692")

  // remove field
  collection.fields.removeById("number2279406108")

  // remove field
  collection.fields.removeById("json1356630662")

  // remove field
  collection.fields.removeById("json582293257")

  return app.save(collection)
})
