/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // update collection data
  unmarshal({
    "viewRule": "@request.auth.company.id = id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // update collection data
  unmarshal({
    "viewRule": "@request.auth.id = \"\" || id ?= @request.auth.company"
  }, collection)

  return app.save(collection)
})
