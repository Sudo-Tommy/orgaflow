/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = \"superadmin\""
  }, collection)

  // remove field
  collection.fields.removeById("r1jnuroj")

  // remove field
  collection.fields.removeById("jmeeutzw")

  // remove field
  collection.fields.removeById("relation3146634886")

  // remove field
  collection.fields.removeById("relation2286437851")

  // remove field
  collection.fields.removeById("relation2149446031")

  // remove field
  collection.fields.removeById("relation1678683980")

  // remove field
  collection.fields.removeById("relation859837811")

  // remove field
  collection.fields.removeById("relation1782674042")

  // remove field
  collection.fields.removeById("relation2729472648")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8")

  // update collection data
  unmarshal({
    "listRule": "assigned_employee.id = @request.auth.id || @request.auth.role = \"superadmin\""
  }, collection)

  // add field
  collection.fields.addAt(24, new Field({
    "cascadeDelete": false,
    "collectionId": "00vkipv5adisx5g",
    "help": "",
    "hidden": false,
    "id": "r1jnuroj",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "company",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(25, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "jmeeutzw",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "assigned_employee",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_16898637",
    "help": "",
    "hidden": false,
    "id": "relation3146634886",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "retirement_home",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(27, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_389921221",
    "help": "",
    "hidden": false,
    "id": "relation2286437851",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "invoice_template",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(28, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_389921221",
    "help": "",
    "hidden": false,
    "id": "relation2149446031",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "time_record_template",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(29, new Field({
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
  collection.fields.addAt(30, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1930317162",
    "help": "",
    "hidden": false,
    "id": "relation859837811",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "contacts",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(31, new Field({
    "cascadeDelete": false,
    "collectionId": "oxbqk37n877m8bq",
    "help": "",
    "hidden": false,
    "id": "relation1782674042",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "appointments",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(32, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3332084752",
    "help": "",
    "hidden": false,
    "id": "relation2729472648",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "invoices",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
