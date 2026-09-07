/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\"",
    "deleteRule": "users.company.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "updateRule": "users.company.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.id = \"\" || id ?= @request.auth.company || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // update collection data
  unmarshal({
    "createRule": "users.id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "deleteRule": "users.id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "updateRule": "users.id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "viewRule": "users.company.id = @request.auth.company.id || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
