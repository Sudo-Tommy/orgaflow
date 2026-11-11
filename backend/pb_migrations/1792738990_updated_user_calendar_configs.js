/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1315632288")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id = user.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "listRule": "@request.auth.id = user.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.id = user.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.id = user.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1315632288")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id = user.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "listRule": "@request.auth.id = user.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.id = user.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.id = user.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
