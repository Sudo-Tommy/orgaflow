/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "updateRule": "@request.auth.id != \"\" && (@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || @request.auth.role = \"user\" || @request.auth.role = \"caregiver\" || id ?= @request.auth.assigned_clients.id || caregiver = @request.auth.id || company.users.id ?= @request.auth.id)"
  }, collection)

  // update field
  collection.fields.addAt(27, new Field({
    "help": "",
    "hidden": false,
    "id": "file2729472648",
    "maxSelect": 100,
    "maxSize": 52428800,
    "mimeTypes": [],
    "name": "documents",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility)"
  }, collection)

  // update field
  collection.fields.addAt(27, new Field({
    "help": "",
    "hidden": false,
    "id": "file2729472648",
    "maxSelect": 10,
    "maxSize": 0,
    "mimeTypes": null,
    "name": "documents",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
})
