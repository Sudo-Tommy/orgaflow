/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // remove field
  collection.fields.removeById("json728423354")

  // remove field
  collection.fields.removeById("bool1324504348")

  // remove field
  collection.fields.removeById("editor18589324")

  // remove field
  collection.fields.removeById("relation3357210912")

  // remove field
  collection.fields.removeById("relation239398109")

  // add field
  collection.fields.addAt(17, new Field({
    "cascadeDelete": false,
    "collectionId": "oxbqk37n877m8bq",
    "help": "",
    "hidden": false,
    "id": "relation1782674042",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "appointments",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // add field
  collection.fields.addAt(7, new Field({
    "help": "Rechnung, Arbeitszeitnachweis, Antrag..",
    "hidden": false,
    "id": "json728423354",
    "maxSize": 0,
    "name": "document_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "help": "",
    "hidden": false,
    "id": "bool1324504348",
    "name": "is_signed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(16, new Field({
    "convertURLs": false,
    "help": "",
    "hidden": false,
    "id": "editor18589324",
    "maxSize": 0,
    "name": "invoice_print",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "editor"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "cascadeDelete": false,
    "collectionId": "6jk3q2mfkm8g415",
    "help": "",
    "hidden": false,
    "id": "relation3357210912",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "time_records",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2109439135",
    "help": "",
    "hidden": false,
    "id": "relation239398109",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "spendings",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // remove field
  collection.fields.removeById("relation1782674042")

  return app.save(collection)
})
