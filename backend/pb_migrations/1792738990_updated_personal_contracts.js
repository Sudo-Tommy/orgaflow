/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1825670003")

  // update collection data
  unmarshal({
    "createRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "deleteRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "listRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "updateRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "viewRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1825670003")

  // update collection data
  unmarshal({
    "createRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "deleteRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "listRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "updateRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "viewRule": "user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
