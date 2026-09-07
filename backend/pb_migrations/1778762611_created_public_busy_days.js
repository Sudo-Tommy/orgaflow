/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 0,
        "min": 0,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "_clone_6w99",
        "max": "",
        "min": "",
        "name": "appointment",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "cascadeDelete": false,
        "collectionId": "00vkipv5adisx5g",
        "help": "",
        "hidden": false,
        "id": "_clone_IgDL",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "company",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      }
    ],
    "id": "pbc_2249334397",
    "indexes": [],
    "listRule": null,
    "name": "public_busy_days",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT \n  appointments.id,\n  appointments.appointment,\n  users.company\nFROM appointments\nLEFT JOIN users ON users.id = appointments.user\n",
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2249334397");

  return app.delete(collection);
})
