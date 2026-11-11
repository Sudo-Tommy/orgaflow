/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1118143612")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "updateRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1118143612")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\""
  }, collection)

  return app.save(collection)
})
