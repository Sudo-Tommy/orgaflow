/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // remove field
  collection.fields.removeById("relation4265146436")

  // remove field
  collection.fields.removeById("relation1397647488")

  // remove field
  collection.fields.removeById("relation1115821818")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("6jk3q2mfkm8g415")

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "oxbqk37n877m8bq",
    "help": "",
    "hidden": false,
    "id": "relation4265146436",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "appointment",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "ij5c2dvndh6ol26",
    "help": "",
    "hidden": false,
    "id": "relation1397647488",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "work",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_2880842635",
    "help": "",
    "hidden": false,
    "id": "relation1115821818",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "drive_records",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
