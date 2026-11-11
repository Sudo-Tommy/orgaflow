/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // update collection data
  unmarshal({
    "createRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "deleteRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "listRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "updateRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "viewRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // update collection data
  unmarshal({
    "createRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "deleteRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "listRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "updateRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "viewRule": "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\""
  }, collection)

  return app.save(collection)
})
