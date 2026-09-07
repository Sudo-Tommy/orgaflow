/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3737793858")

  // update collection data
  unmarshal({
    "createRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'\n",
    "deleteRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'\n",
    "listRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'\n",
    "updateRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'\n",
    "viewRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'\n"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3737793858")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "listRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
})
