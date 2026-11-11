/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_693723036")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "listRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_693723036")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"superadmin\"",
    "listRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
