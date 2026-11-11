/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_389921221")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.role = \"developer\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_389921221")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
