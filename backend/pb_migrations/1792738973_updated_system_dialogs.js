/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1936697251")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != '' && (@request.auth.role = 'developer' || @request.auth.role = 'superadmin' || sender = @request.auth.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1936697251")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || sender = @request.auth.id"
  }, collection)

  return app.save(collection)
})
