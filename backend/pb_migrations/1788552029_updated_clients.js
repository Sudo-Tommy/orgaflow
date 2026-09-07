/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility)",
    "deleteRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility)",
    "listRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility) || (@request.auth.role = \"caregiver\" && id ?= @request.auth.assigned_clients.id) || (@request.auth.role = \"client\" && id = @request.auth.client_profile_id)",
    "updateRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility)",
    "viewRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility) || (@request.auth.role = \"caregiver\" && id ?= @request.auth.assigned_clients.id) || (@request.auth.role = \"client\" && id = @request.auth.client_profile_id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility)",
    "deleteRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility)",
    "listRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility) || (@request.auth.role = \"caregiver\" && id ?= @request.auth.assigned_clients.id) || (@request.auth.role = \"client\" && id = @request.auth.client_profile_id)",
    "updateRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility)",
    "viewRule": "@request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility) || (@request.auth.role = \"caregiver\" && id ?= @request.auth.assigned_clients.id) || (@request.auth.role = \"client\" && id = @request.auth.client_profile_id)"
  }, collection)

  return app.save(collection)
})
