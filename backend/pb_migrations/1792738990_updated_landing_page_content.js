/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1329741102")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1329741102")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
