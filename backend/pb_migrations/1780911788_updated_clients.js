/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "createRule": "company.users.id ?= @request.auth.id || @request.auth.role = \"superadmin\"",
    "deleteRule": "company.users.id ?= @request.auth.id || @request.auth.role = \"superadmin\"",
    "listRule": "company.users.id ?= @request.auth.id || @request.auth.role = \"superadmin\"",
    "updateRule": "company.users.id ?= @request.auth.id || @request.auth.role = \"superadmin\"",
    "viewRule": "company.users.id ?= @request.auth.id || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "createRule": "company_via_clients.users.id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "deleteRule": "company_via_clients.users.id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "listRule": "company_via_clients.users.id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "updateRule": "company_via_clients.users.id = @request.auth.id || @request.auth.role = \"superadmin\"",
    "viewRule": "company_via_clients.users.id = @request.auth.id || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
