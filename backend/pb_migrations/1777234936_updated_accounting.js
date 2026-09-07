/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2473931125")

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "number1735513964",
    "max": null,
    "min": null,
    "name": "amount_net",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(4, new Field({
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
      "0",
      "7",
      "19"
    ]
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "number2375376167",
    "max": null,
    "min": null,
    "name": "amount_gross",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "date1222445531",
    "max": "",
    "min": "",
    "name": "transaction_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text105650625",
    "max": 0,
    "min": 0,
    "name": "category",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "select2069996022",
    "maxSelect": 0,
    "name": "payment_method",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Banküberweisung",
      "Bar"
    ]
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 0,
    "name": "status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Offen",
      "Bezahlt",
      "Überfälltig",
      "Storniert"
    ]
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2980368679",
    "max": 0,
    "min": 0,
    "name": "account_number",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "file451153308",
    "maxSelect": 10,
    "maxSize": 0,
    "mimeTypes": null,
    "name": "receipt_file",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3332084752",
    "help": "",
    "hidden": false,
    "id": "relation2129315035",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "related_document",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "relation1188192992",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "createdby",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text18589324",
    "max": 0,
    "min": 0,
    "name": "notes",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2473931125")

  // remove field
  collection.fields.removeById("number1735513964")

  // remove field
  collection.fields.removeById("select3278057665")

  // remove field
  collection.fields.removeById("number2375376167")

  // remove field
  collection.fields.removeById("date1222445531")

  // remove field
  collection.fields.removeById("text105650625")

  // remove field
  collection.fields.removeById("select2069996022")

  // remove field
  collection.fields.removeById("select2063623452")

  // remove field
  collection.fields.removeById("text2980368679")

  // remove field
  collection.fields.removeById("file451153308")

  // remove field
  collection.fields.removeById("relation2129315035")

  // remove field
  collection.fields.removeById("relation1188192992")

  // remove field
  collection.fields.removeById("text18589324")

  return app.save(collection)
})
