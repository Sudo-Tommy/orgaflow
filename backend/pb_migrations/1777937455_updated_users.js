/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("relation1782674042")

  // remove field
  collection.fields.removeById("relation13119092")

  // remove field
  collection.fields.removeById("relation859837811")

  // remove field
  collection.fields.removeById("relation2729472648")

  // remove field
  collection.fields.removeById("relation1841627621")

  // remove field
  collection.fields.removeById("relation392560104")

  // remove field
  collection.fields.removeById("relation1337919823")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(16, new Field({
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

  // add field
  collection.fields.addAt(17, new Field({
    "cascadeDelete": false,
    "collectionId": "hu9womf4xnkbrk8",
    "help": "",
    "hidden": false,
    "id": "relation13119092",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "clients",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1930317162",
    "help": "",
    "hidden": false,
    "id": "relation859837811",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "contacts",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(19, new Field({
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

  // add field
  collection.fields.addAt(20, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2473931125",
    "help": "",
    "hidden": false,
    "id": "relation1841627621",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "accounting",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3885293212",
    "help": "",
    "hidden": false,
    "id": "relation392560104",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "letterboxes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "cascadeDelete": false,
    "collectionId": "00vkipv5adisx5g",
    "help": "",
    "hidden": false,
    "id": "relation1337919823",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "company",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
