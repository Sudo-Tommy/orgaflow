/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(14, new Field({
    "help": "",
    "hidden": false,
    "id": "flaqvwry",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "guest",
      "user",
      "admin",
      "superadmin",
      "owner",
      "caregiver",
      "client",
      "employee",
      "developer"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(14, new Field({
    "help": "",
    "hidden": false,
    "id": "flaqvwry",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "guest",
      "user",
      "admin",
      "superadmin",
      "owner",
      "caregiver",
      "client",
      "employee"
    ]
  }))

  return app.save(collection)
})
