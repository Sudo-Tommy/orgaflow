/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // add field
  collection.fields.addAt(52, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text159765295",
    "max": 0,
    "min": 0,
    "name": "lexoffice_contact_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // remove field
  collection.fields.removeById("text159765295")

  return app.save(collection)
})
