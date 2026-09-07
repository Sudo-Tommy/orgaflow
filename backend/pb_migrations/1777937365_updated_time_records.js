/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "relation2375276105",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "user",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "oxbqk37n877m8bq",
    "help": "",
    "hidden": false,
    "id": "relation4265146436",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "appointment",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // remove field
  collection.fields.removeById("relation2375276105")

  // remove field
  collection.fields.removeById("relation4265146436")

  return app.save(collection)
})
