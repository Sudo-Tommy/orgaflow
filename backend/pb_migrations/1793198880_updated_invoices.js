/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // add field
  collection.fields.addAt(32, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2335821434",
    "max": 0,
    "min": 0,
    "name": "lexoffice_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(33, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2974803307",
    "max": 0,
    "min": 0,
    "name": "lexoffice_voucher_status",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(34, new Field({
    "help": "",
    "hidden": false,
    "id": "date1253997676",
    "max": "",
    "min": "",
    "name": "lexoffice_synced_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // remove field
  collection.fields.removeById("text2335821434")

  // remove field
  collection.fields.removeById("text2974803307")

  // remove field
  collection.fields.removeById("date1253997676")

  return app.save(collection)
})
