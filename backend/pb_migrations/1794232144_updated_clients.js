/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || @request.auth.role = \"employee\" || @request.auth.role = \"caregiver\"",
    "listRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || @request.auth.role = \"user\" || @request.auth.role = \"caregiver\" || @request.auth.role = \"employee\" || company.users.id ?= @request.auth.id || caregiver = @request.auth.id || id ?= @request.auth.assigned_clients.id || (facility != \"\" && facility = @request.auth.facility) || (@request.auth.role = \"client\" && id = @request.auth.client_profile_id))",
    "viewRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || @request.auth.role = \"user\" || @request.auth.role = \"caregiver\" || @request.auth.role = \"employee\" || company.users.id ?= @request.auth.id || caregiver = @request.auth.id || id ?= @request.auth.assigned_clients.id || (facility != \"\" && facility = @request.auth.facility) || (@request.auth.role = \"client\" && id = @request.auth.client_profile_id))"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || (@request.auth.role = \"admin\" && facility = @request.auth.facility)",
    "listRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || @request.auth.role = \"user\" || @request.auth.role = \"caregiver\" || company.users.id ?= @request.auth.id || caregiver = @request.auth.id || id ?= @request.auth.assigned_clients.id || (facility != \"\" && facility = @request.auth.facility) || (@request.auth.role = \"client\" && id = @request.auth.client_profile_id))",
    "viewRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || @request.auth.role = \"user\" || @request.auth.role = \"caregiver\" || company.users.id ?= @request.auth.id || caregiver = @request.auth.id || id ?= @request.auth.assigned_clients.id || (facility != \"\" && facility = @request.auth.facility) || (@request.auth.role = \"client\" && id = @request.auth.client_profile_id))"
  }, collection)

  return app.save(collection)
})
