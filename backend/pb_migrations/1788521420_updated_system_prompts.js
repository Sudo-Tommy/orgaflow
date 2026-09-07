/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4176908797")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "deleteRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "listRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\"",
    "viewRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4176908797")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\"",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
