/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // add field
  collection.fields.addAt(27, new Field({
    "help": "",
    "hidden": false,
    "id": "json_app_checklist",
    "maxSize": 2000000,
    "name": "checklist",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // remove field
  collection.fields.removeById("json_app_checklist")

  return app.save(collection)
})
