/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.role = \"admin\" || id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "listRule": "@request.auth.role = \"admin\" || id = @request.auth.id  || @request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.role = \"admin\" || id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.role = \"admin\" || id = @request.auth.id || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\" || id = @request.auth.id",
    "listRule": "@request.auth.role = \"admin\" || id = @request.auth.id",
    "updateRule": "@request.auth.role = \"admin\" || id = @request.auth.id",
    "viewRule": "@request.auth.role = \"admin\" || id = @request.auth.id"
  }, collection)

  return app.save(collection)
})
