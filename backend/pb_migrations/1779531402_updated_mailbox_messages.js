/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2127080852")

  // add field
  collection.fields.addAt(11, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "relation2472643433",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "send_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(12, new Field({
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
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2127080852")

  // remove field
  collection.fields.removeById("relation2472643433")

  // remove field
  collection.fields.removeById("relation1337919823")

  return app.save(collection)
})
