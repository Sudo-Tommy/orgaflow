/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1930317162")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = \"superadmin\""
  }, collection)

  // remove field
  collection.fields.removeById("relation3343123541")

  // remove field
  collection.fields.removeById("relation2375276105")

  // remove field
  collection.fields.removeById("relation214166327")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1930317162")

  // update collection data
  unmarshal({
    "listRule": "client.company.id = @request.auth.company.id || @request.auth.role = \"superadmin\""
  }, collection)

  // add field
  collection.fields.addAt(12, new Field({
    "cascadeDelete": false,
    "collectionId": "hu9womf4xnkbrk8",
    "help": "",
    "hidden": false,
    "id": "relation3343123541",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "client",
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
  collection.fields.addAt(15, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_16898637",
    "help": "",
    "hidden": false,
    "id": "relation214166327",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "employee_from",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
