/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2269083802")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "listRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "updateRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "viewRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2269083802")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "listRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "updateRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "viewRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\""
  }, collection)

  return app.save(collection)
})
