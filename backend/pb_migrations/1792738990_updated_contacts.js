/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1930317162")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || (created_by != \"\" && created_by = @request.auth.id)",
    "updateRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || (created_by != \"\" && created_by = @request.auth.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1930317162")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || (created_by != \"\" && created_by = @request.auth.id)",
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || (created_by != \"\" && created_by = @request.auth.id)"
  }, collection)

  return app.save(collection)
})
