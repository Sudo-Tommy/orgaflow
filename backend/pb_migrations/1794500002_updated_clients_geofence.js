/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  collection.fields.add(new Field({
    "help": "Ankunftsradius in Metern für Fahrtenbuch-Hinweis (Standard 150)",
    "hidden": false,
    "id": "number_geofence_radius",
    "max": 5000,
    "min": 30,
    "name": "geofence_radius",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.add(new Field({
    "help": "Breitengrad der Klientenadresse",
    "hidden": false,
    "id": "number_geo_lat",
    "max": 90,
    "min": -90,
    "name": "geo_lat",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.add(new Field({
    "help": "Längengrad der Klientenadresse",
    "hidden": false,
    "id": "number_geo_lng",
    "max": 180,
    "min": -180,
    "name": "geo_lng",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  collection.fields.removeById("number_geofence_radius")
  collection.fields.removeById("number_geo_lat")
  collection.fields.removeById("number_geo_lng")

  return app.save(collection)
})
