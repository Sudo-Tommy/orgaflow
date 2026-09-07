/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2473931125")

  // update collection data
  unmarshal({
    "createRule": "createdby.id = @request.auth.id",
    "deleteRule": "createdby.id = @request.auth.id",
    "listRule": "createdby.id = @request.auth.id",
    "updateRule": "createdby.id = @request.auth.id",
    "viewRule": "createdby.id = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2473931125")

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
