/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\"",
    "updateRule": "users.company.id = @request.auth.company.id || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.role = \"superadmin\"",
    "updateRule": "users.company.id = @request.auth.company.id || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
