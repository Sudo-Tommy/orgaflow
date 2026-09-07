/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1930317162")

  // add field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "select1395483659",
    "maxSelect": 0,
    "name": "salutation",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Herr",
      "Frau",
      "Keine Angabe"
    ]
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text491676904",
    "max": 0,
    "min": 0,
    "name": "company_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1930317162")

  // remove field
  collection.fields.removeById("select1395483659")

  // remove field
  collection.fields.removeById("text491676904")

  return app.save(collection)
})
