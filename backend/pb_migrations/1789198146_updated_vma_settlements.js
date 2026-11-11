/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1470912865")

  // add field
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "autodate_created_vma",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "hidden": false,
    "id": "autodate_updated_vma",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1470912865")

  // remove field
  collection.fields.removeById("autodate_created_vma")

  // remove field
  collection.fields.removeById("autodate_updated_vma")

  return app.save(collection)
})
