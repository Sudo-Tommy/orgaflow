/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // update collection data
  unmarshal({
    "createRule": "client.company_via_clients.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "deleteRule": "client.company_via_clients.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "listRule": "",
    "updateRule": "client.company_via_clients.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "viewRule": "client.company_via_clients.id = @request.auth.company.id || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // update collection data
  unmarshal({
    "createRule": "company.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "deleteRule": "company.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "listRule": "company.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "updateRule": "company.id = @request.auth.company.id || @request.auth.role = \"superadmin\"",
    "viewRule": "company.id = @request.auth.company.id || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
