/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // add field
  collection.fields.addAt(18, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text167922567",
    "max": 0,
    "min": 0,
    "name": "calendar_color",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("00vkipv5adisx5g")

  // remove field
  collection.fields.removeById("text167922567")

  return app.save(collection)
})
