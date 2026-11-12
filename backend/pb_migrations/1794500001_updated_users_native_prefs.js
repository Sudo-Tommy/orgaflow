/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.fields.add(new Field({
    "help": "Vorlaufzeiten für Termin-Erinnerungen in Minuten (JSON-Array)",
    "hidden": false,
    "id": "json_notify_offsets",
    "maxSize": 50000,
    "name": "notify_offsets",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "help": "Uhrzeit für die tägliche Morgenübersicht (HH:MM) oder leer",
    "hidden": false,
    "id": "text_notify_daily_time",
    "max": 10,
    "min": 0,
    "name": "notify_daily_time",
    "pattern": "",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.add(new Field({
    "help": "Erinnerung nach Terminende (Fahrt beenden / Beleg erfassen)",
    "hidden": false,
    "id": "bool_notify_after_end",
    "name": "notify_after_end",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  collection.fields.add(new Field({
    "help": "Hinweise zu Urlaub und Abwesenheiten",
    "hidden": false,
    "id": "bool_notify_absences",
    "name": "notify_absences",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  collection.fields.add(new Field({
    "help": "Sekunden bis zur automatischen App-Sperre (0 = sofort)",
    "hidden": false,
    "id": "number_lock_timeout_sec",
    "max": 86400,
    "min": 0,
    "name": "lock_timeout_sec",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.fields.removeById("json_notify_offsets")
  collection.fields.removeById("text_notify_daily_time")
  collection.fields.removeById("bool_notify_after_end")
  collection.fields.removeById("bool_notify_absences")
  collection.fields.removeById("number_lock_timeout_sec")

  return app.save(collection)
})
