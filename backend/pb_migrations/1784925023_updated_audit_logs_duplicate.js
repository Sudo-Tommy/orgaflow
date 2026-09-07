/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_693723036")

  // update collection data
  unmarshal({
    "name": "audit_logs"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_693723036")

  // update collection data
  unmarshal({
    "name": "audit_logs_duplicate"
  }, collection)

  return app.save(collection)
})
