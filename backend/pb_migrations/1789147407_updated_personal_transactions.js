/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_528246199")

  // add field
  collection.fields.addAt(18, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_l2ymd27p",
    "max": 0,
    "min": 0,
    "name": "recipient_or_payer",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_94t8ra16",
    "max": 0,
    "min": 0,
    "name": "payment_method",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(20, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_utcokzei",
    "max": 0,
    "min": 0,
    "name": "invoice_number",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "help": "",
    "hidden": false,
    "id": "date_3gjlyb8x",
    "max": "",
    "min": "",
    "name": "invoice_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "help": "",
    "hidden": false,
    "id": "date_8htftls8",
    "max": "",
    "min": "",
    "name": "due_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(23, new Field({
    "help": "",
    "hidden": false,
    "id": "date_68crco6j",
    "max": "",
    "min": "",
    "name": "paid_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(24, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_80n8cpvl",
    "max": 0,
    "min": 0,
    "name": "contract_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(25, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_0ztm6drj",
    "max": 0,
    "min": 0,
    "name": "payment_status",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_0qajh8zi",
    "max": 0,
    "min": 0,
    "name": "description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_528246199")

  // remove field
  collection.fields.removeById("text_l2ymd27p")

  // remove field
  collection.fields.removeById("text_94t8ra16")

  // remove field
  collection.fields.removeById("text_utcokzei")

  // remove field
  collection.fields.removeById("date_3gjlyb8x")

  // remove field
  collection.fields.removeById("date_8htftls8")

  // remove field
  collection.fields.removeById("date_68crco6j")

  // remove field
  collection.fields.removeById("text_80n8cpvl")

  // remove field
  collection.fields.removeById("text_0ztm6drj")

  // remove field
  collection.fields.removeById("text_0qajh8zi")

  return app.save(collection)
})
