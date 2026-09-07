/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // add field
  collection.fields.addAt(41, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3702418234",
    "max": 0,
    "min": 0,
    "name": "inheritor_name",
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
    "id": "text1325557185",
    "max": 0,
    "min": 0,
    "name": "inheritor_relation",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(43, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1805805135",
    "max": 0,
    "min": 0,
    "name": "inheritor_phone",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(44, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3363802598",
    "max": 0,
    "min": 0,
    "name": "inheritor_email",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(45, new Field({
    "help": "",
    "hidden": false,
    "id": "bool1236004439",
    "name": "inheritor_has_power_of_attorney",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(46, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text787896094",
    "max": 0,
    "min": 0,
    "name": "inheritor_notes",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // remove field
  collection.fields.removeById("text3702418234")

  // remove field
  collection.fields.removeById("text1325557185")

  // remove field
  collection.fields.removeById("text1805805135")

  // remove field
  collection.fields.removeById("text3363802598")

  // remove field
  collection.fields.removeById("bool1236004439")

  // remove field
  collection.fields.removeById("text787896094")

  return app.save(collection)
})
