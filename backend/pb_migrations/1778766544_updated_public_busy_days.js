/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2249334397")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n  appointments.id,\n  appointments.appointment,\n  users.company,\n  (CASE WHEN appointments.description LIKE '%[BLOCK]%' THEN 1 ELSE 0 END) as is_blocked\nFROM appointments\nLEFT JOIN users ON users.id = appointments.user\n\n"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_Zq4P")

  // remove field
  collection.fields.removeById("_clone_RNAN")

  // add field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_77Js",
    "max": "",
    "min": "",
    "name": "appointment",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "00vkipv5adisx5g",
    "help": "",
    "hidden": false,
    "id": "_clone_Bssd",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "company",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "json3429461320",
    "maxSize": 1,
    "name": "is_blocked",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2249334397")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n  appointments.id,\n  appointments.appointment,\n  users.company\nFROM appointments\nLEFT JOIN users ON users.id = appointments.user\n"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_Zq4P",
    "max": "",
    "min": "",
    "name": "appointment",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "00vkipv5adisx5g",
    "help": "",
    "hidden": false,
    "id": "_clone_RNAN",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "company",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // remove field
  collection.fields.removeById("_clone_77Js")

  // remove field
  collection.fields.removeById("_clone_Bssd")

  // remove field
  collection.fields.removeById("json3429461320")

  return app.save(collection)
})
