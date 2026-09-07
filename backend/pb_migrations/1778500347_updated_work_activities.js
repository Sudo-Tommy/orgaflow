/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ij5c2dvndh6ol26")

  // update collection data
  unmarshal({
    "name": "tasks"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("ij5c2dvndh6ol26")

  // update collection data
  unmarshal({
    "name": "work_activities"
  }, collection)

  return app.save(collection)
})
