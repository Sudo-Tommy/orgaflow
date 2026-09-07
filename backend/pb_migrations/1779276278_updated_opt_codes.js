/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1809339801")

  // update collection data
  unmarshal({
    "name": "otp_codes"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1809339801")

  // update collection data
  unmarshal({
    "name": "opt_codes"
  }, collection)

  return app.save(collection)
})
