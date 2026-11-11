/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility && role != \"owner\" && role != \"superadmin\")",
    "listRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || id = @request.auth.id || company = @request.auth.company || company.users.id ?= @request.auth.id || (facility != \"\" && facility = @request.auth.facility))",
    "updateRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || id = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || id = @request.auth.id || company = @request.auth.company || company.users.id ?= @request.auth.id || (facility != \"\" && facility = @request.auth.facility))"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility && role != \"owner\" && role != \"superadmin\")",
    "listRule": "@request.auth.id != \"\" && (@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || id = @request.auth.id || company = @request.auth.company || company.users.id ?= @request.auth.id || (facility != \"\" && facility = @request.auth.facility))",
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || id = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && (@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || id = @request.auth.id || company = @request.auth.company || company.users.id ?= @request.auth.id || (facility != \"\" && facility = @request.auth.facility))"
  }, collection)

  return app.save(collection)
})
