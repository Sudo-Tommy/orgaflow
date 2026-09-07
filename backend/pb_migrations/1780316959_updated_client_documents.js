/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1476336642")

  // update field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "select728423354",
    "maxSelect": 0,
    "name": "document_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Vollmacht",
      "Antrag",
      "Kündigung",
      "Vertrag",
      "Sonstiges"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1476336642")

  // update field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "select728423354",
    "maxSelect": 0,
    "name": "document_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "vollmacht",
      "antrag",
      "kündigung",
      "vertrag",
      "sonstiges"
    ]
  }))

  return app.save(collection)
})
