/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("userMailConfigs001")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "00vkipv5adisx5g",
    "help": "",
    "hidden": false,
    "id": "relation1653163849",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "relation",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "exceptDomains": null,
    "help": "",
    "hidden": false,
    "id": "email2962097998",
    "name": "email_address",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "email"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text602682326",
    "max": 0,
    "min": 0,
    "name": "smtp_host",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "number2941943271",
    "max": null,
    "min": null,
    "name": "smtp_port",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1633220194",
    "max": 0,
    "min": 0,
    "name": "smtp_user",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text4212033756",
    "max": 0,
    "min": 0,
    "name": "smtp_password",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text803489872",
    "max": 0,
    "min": 0,
    "name": "imap_host",
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
    "id": "number2740061793",
    "max": null,
    "min": null,
    "name": "imap_port",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("userMailConfigs001")

  // remove field
  collection.fields.removeById("relation1653163849")

  // remove field
  collection.fields.removeById("email2962097998")

  // remove field
  collection.fields.removeById("text602682326")

  // remove field
  collection.fields.removeById("number2941943271")

  // remove field
  collection.fields.removeById("text1633220194")

  // remove field
  collection.fields.removeById("text4212033756")

  // remove field
  collection.fields.removeById("text803489872")

  // remove field
  collection.fields.removeById("number2740061793")

  return app.save(collection)
})
