/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility && role != \"owner\" && role != \"superadmin\")",
    "deleteRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility && role != \"owner\" && role != \"superadmin\")",
    "listRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility) || id = @request.auth.id",
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility && role != \"owner\" && role != \"superadmin\")",
    "viewRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility) || id = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility && role != \"owner\")",
    "deleteRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility && role != \"owner\")",
    "listRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility) || id = @request.auth.id",
    "updateRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility && role != \"owner\")",
    "viewRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility) || id = @request.auth.id"
  }, collection)

  return app.save(collection)
})
