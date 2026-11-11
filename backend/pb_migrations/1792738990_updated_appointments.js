/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || user = @request.auth.id || assigned_to = @request.auth.id || client.caregiver = @request.auth.id || client.id ?= @request.auth.assigned_clients.id)",
    "updateRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || user = @request.auth.id || assigned_to = @request.auth.id || client.caregiver = @request.auth.id || client.id ?= @request.auth.assigned_clients.id)",
    "viewRule": "@request.auth.id != \"\" && (@request.auth.role = \"developer\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || user = @request.auth.id || assigned_to = @request.auth.id || client.caregiver = @request.auth.id || client.id ?= @request.auth.assigned_clients.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && (@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || user = @request.auth.id || assigned_to = @request.auth.id || client.caregiver = @request.auth.id || client.id ?= @request.auth.assigned_clients.id)",
    "updateRule": "@request.auth.id != \"\" && (@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || user = @request.auth.id || assigned_to = @request.auth.id || client.caregiver = @request.auth.id || client.id ?= @request.auth.assigned_clients.id)",
    "viewRule": "@request.auth.id != \"\" && (@request.auth.role = \"superadmin\" || @request.auth.role = \"owner\" || @request.auth.role = \"admin\" || user = @request.auth.id || assigned_to = @request.auth.id || client.caregiver = @request.auth.id || client.id ?= @request.auth.assigned_clients.id)"
  }, collection)

  return app.save(collection)
})
