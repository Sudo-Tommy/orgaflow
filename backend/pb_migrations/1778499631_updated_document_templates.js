/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_389921221")

  // remove field
  collection.fields.removeById("relation3343123541")

  // remove field
  collection.fields.removeById("relation1337919823")

  // remove field
  collection.fields.removeById("relation1281549880")

  // remove field
  collection.fields.removeById("relation1678683980")

  // remove field
  collection.fields.removeById("relation344172009")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_389921221")

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "hu9womf4xnkbrk8",
    "help": "",
    "hidden": false,
    "id": "relation3343123541",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "client",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "00vkipv5adisx5g",
    "help": "",
    "hidden": false,
    "id": "relation1337919823",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "company",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1930317162",
    "help": "",
    "hidden": false,
    "id": "relation1281549880",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "contact",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_281905539",
    "help": "",
    "hidden": false,
    "id": "relation1678683980",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "insurance",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "relation344172009",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "user",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
