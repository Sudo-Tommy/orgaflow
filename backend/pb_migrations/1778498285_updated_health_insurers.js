/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_281905539")

  // update collection data
  unmarshal({
    "name": "insurancies"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_281905539")

  // update collection data
  unmarshal({
    "name": "health_insurers"
  }, collection)

  return app.save(collection)
})
