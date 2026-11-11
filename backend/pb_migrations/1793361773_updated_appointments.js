/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // add field
  collection.fields.addAt(40, new Field({
    "help": "",
    "hidden": false,
    "id": "date2947327145",
    "max": "",
    "min": "",
    "name": "appointment_end",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq")

  // remove field
  collection.fields.removeById("date2947327145")

  return app.save(collection)
})
