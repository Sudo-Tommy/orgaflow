/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2249334397")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n  appointments.id,\n  appointments.appointment,\n  users.company,\n  appointments.client,\n  is_visible,\n  (CASE WHEN appointments.description LIKE '%[BLOCK]%' THEN 1 ELSE 0 END) as is_blocked\nFROM appointments\nLEFT JOIN users ON users.id = appointments.user\n\n"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_UbSM")

  // remove field
  collection.fields.removeById("_clone_h68W")

  // remove field
  collection.fields.removeById("_clone_heXZ")

  // add field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_TywZ",
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
    "id": "_clone_Uoi6",
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
    "cascadeDelete": false,
    "collectionId": "hu9womf4xnkbrk8",
    "help": "",
    "hidden": false,
    "id": "_clone_yPih",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "client",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_IIEj",
    "name": "is_visible",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2249334397")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n  appointments.id,\n  appointments.appointment,\n  users.company,\n  appointments.client,\n  (CASE WHEN appointments.description LIKE '%[BLOCK]%' THEN 1 ELSE 0 END) as is_blocked\nFROM appointments\nLEFT JOIN users ON users.id = appointments.user\n\n"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "_clone_UbSM",
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
    "id": "_clone_h68W",
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
    "cascadeDelete": false,
    "collectionId": "hu9womf4xnkbrk8",
    "help": "",
    "hidden": false,
    "id": "_clone_heXZ",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "client",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // remove field
  collection.fields.removeById("_clone_TywZ")

  // remove field
  collection.fields.removeById("_clone_Uoi6")

  // remove field
  collection.fields.removeById("_clone_yPih")

  // remove field
  collection.fields.removeById("_clone_IIEj")

  return app.save(collection)
})
