/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // update collection data
  unmarshal({
    "listRule": "user.id = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // update collection data
  unmarshal({
    "listRule": "user.company.id = @request.auth.company.id"
  }, collection)

  return app.save(collection)
})
