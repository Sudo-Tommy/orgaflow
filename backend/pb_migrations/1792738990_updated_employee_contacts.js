/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1051942053")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"owner\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"owner\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\"",
    "listRule": "@request.auth.role = \"owner\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\" || employee = @request.auth.id",
    "updateRule": "@request.auth.role = \"owner\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\"",
    "viewRule": "@request.auth.role = \"owner\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\" || employee = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1051942053")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"owner\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"owner\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\"",
    "listRule": "@request.auth.role = \"owner\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\" || employee = @request.auth.id",
    "updateRule": "@request.auth.role = \"owner\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\"",
    "viewRule": "@request.auth.role = \"owner\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"admin\" || employee = @request.auth.id"
  }, collection)

  return app.save(collection)
})
