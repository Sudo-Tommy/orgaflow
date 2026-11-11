/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(35, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1329388006",
    "max": 0,
    "min": 0,
    "name": "birth_place",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(36, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2328202096",
    "max": 0,
    "min": 0,
    "name": "nationality",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(37, new Field({
    "help": "",
    "hidden": false,
    "id": "select3343321666",
    "maxSelect": 0,
    "name": "gender",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "weiblich",
      "männlich",
      "divers",
      "keine_angabe"
    ]
  }))

  // add field
  collection.fields.addAt(38, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1354054892",
    "max": 0,
    "min": 0,
    "name": "bank_iban",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(39, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3196647230",
    "max": 0,
    "min": 0,
    "name": "bank_bic",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(40, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text4098043016",
    "max": 0,
    "min": 0,
    "name": "bank_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(41, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3318360073",
    "max": 0,
    "min": 0,
    "name": "bank_owner",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(42, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2997363928",
    "max": 0,
    "min": 0,
    "name": "tax_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(43, new Field({
    "help": "",
    "hidden": false,
    "id": "select1580330174",
    "maxSelect": 0,
    "name": "tax_class",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6"
    ]
  }))

  // add field
  collection.fields.addAt(44, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2744095148",
    "max": 0,
    "min": 0,
    "name": "social_security_nr",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(45, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1434977502",
    "max": 0,
    "min": 0,
    "name": "health_insurance",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(46, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text177404655",
    "max": 0,
    "min": 0,
    "name": "drivers_license",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(47, new Field({
    "help": "",
    "hidden": false,
    "id": "bool1140702055",
    "name": "has_car",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(48, new Field({
    "help": "",
    "hidden": false,
    "id": "bool1547006204",
    "name": "willing_to_travel",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("text1329388006")

  // remove field
  collection.fields.removeById("text2328202096")

  // remove field
  collection.fields.removeById("select3343321666")

  // remove field
  collection.fields.removeById("text1354054892")

  // remove field
  collection.fields.removeById("text3196647230")

  // remove field
  collection.fields.removeById("text4098043016")

  // remove field
  collection.fields.removeById("text3318360073")

  // remove field
  collection.fields.removeById("text2997363928")

  // remove field
  collection.fields.removeById("select1580330174")

  // remove field
  collection.fields.removeById("text2744095148")

  // remove field
  collection.fields.removeById("text1434977502")

  // remove field
  collection.fields.removeById("text177404655")

  // remove field
  collection.fields.removeById("bool1140702055")

  // remove field
  collection.fields.removeById("bool1547006204")

  return app.save(collection)
})
