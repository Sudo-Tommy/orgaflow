/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3737793858")

  // update collection data
  unmarshal({
    "viewRule": "user = @request.auth.id || @request.auth.role = 'superadmin'\n"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3737793858")

  // update collection data
  unmarshal({
    "viewRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'\n"
  }, collection)

  return app.save(collection)
})
