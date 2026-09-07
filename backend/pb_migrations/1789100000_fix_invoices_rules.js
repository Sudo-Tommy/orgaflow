/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  const rule = "user.id = @request.auth.id || company.users.id ?= @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""

  unmarshal({
    "createRule": rule,
    "deleteRule": rule,
    "listRule": rule,
    "updateRule": rule,
    "viewRule": rule
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  return app.save(collection)
})
