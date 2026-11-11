/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1398322501")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "deleteRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "listRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && id = @request.auth.facility)",
    "updateRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "viewRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && id = @request.auth.facility)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1398322501")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "deleteRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "listRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && id = @request.auth.facility)",
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "viewRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && id = @request.auth.facility)"
  }, collection)

  return app.save(collection)
})
