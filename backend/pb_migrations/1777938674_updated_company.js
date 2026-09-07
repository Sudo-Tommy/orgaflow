/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // update collection data
  unmarshal({
    "listRule": ""
  }, collection)

  // update field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "3kdndety",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "users",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // update collection data
  unmarshal({
    "listRule": "member.id = @request.auth.id"
  }, collection)

  // update field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "3kdndety",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "member",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
