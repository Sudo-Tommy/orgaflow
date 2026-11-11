/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3737793858")

  // update collection data
  unmarshal({
    "createRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'developer' || @request.auth.role = 'superadmin'\n",
    "deleteRule": "user = @request.auth.id || @request.auth.role = 'developer' || @request.auth.role = 'superadmin' || (@request.auth.role = 'admin' && user.role != 'superadmin' && user.role != 'admin')\n\n",
    "updateRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'developer' || @request.auth.role = 'superadmin'"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3737793858")

  // update collection data
  unmarshal({
    "createRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'\n",
    "deleteRule": "user = @request.auth.id || @request.auth.role = 'superadmin' || (@request.auth.role = 'admin' && user.role != 'superadmin' && user.role != 'admin')\n\n",
    "updateRule": "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'"
  }, collection)

  return app.save(collection)
})
