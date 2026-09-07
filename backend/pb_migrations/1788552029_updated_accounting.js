/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2473931125")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || createdby.id = @request.auth.id",
    "deleteRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || createdby.id = @request.auth.id",
    "listRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || createdby.id = @request.auth.id",
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || createdby.id = @request.auth.id",
    "viewRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || createdby.id = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2473931125")

  // update collection data
  unmarshal({
    "createRule": "createdby.id = @request.auth.id",
    "deleteRule": "createdby.id = @request.auth.id",
    "listRule": "createdby.id = @request.auth.id",
    "updateRule": "createdby.id = @request.auth.id",
    "viewRule": "createdby.id = @request.auth.id"
  }, collection)

  return app.save(collection)
})
