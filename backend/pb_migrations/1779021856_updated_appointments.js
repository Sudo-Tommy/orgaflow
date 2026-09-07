/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = \"superadmin\" || user.company ?= @request.auth.company"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.collectionName = \"_superusers\" || @request.auth.role = \"superadmin\" || user.company ?= @request.auth.company"
  }, collection)

  return app.save(collection)
})
