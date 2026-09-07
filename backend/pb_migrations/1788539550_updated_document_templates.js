/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_389921221")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_389921221")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "listRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
