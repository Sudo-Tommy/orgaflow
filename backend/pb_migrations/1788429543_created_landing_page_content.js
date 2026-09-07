/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1363966203",
        "max": 0,
        "min": 0,
        "name": "section_key",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json2791688320",
        "maxSize": 0,
        "name": "content_json",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "json"
      }
    ],
    "id": "pbc_1329741102",
    "indexes": [],
    "listRule": "",
    "name": "landing_page_content",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1329741102");

  return app.delete(collection);
})
