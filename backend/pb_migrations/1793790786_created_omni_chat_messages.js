/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id = user || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"developer\"",
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
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation2375276105",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select1466534506",
        "maxSelect": 0,
        "name": "role",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "user",
          "assistant"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text999008199",
        "max": 0,
        "min": 0,
        "name": "text",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json1078797055",
        "maxSize": 0,
        "name": "action_link",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "file1204091606",
        "maxSelect": 5,
        "maxSize": 10485760,
        "mimeTypes": null,
        "name": "attachments",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select3632866850",
        "maxSelect": 0,
        "name": "rating",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "up",
          "down"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "bool1923678028",
        "name": "is_ticket_generated",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1879066578",
        "max": 0,
        "min": 0,
        "name": "ticket_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_3248317036",
    "indexes": [],
    "listRule": "@request.auth.id = user || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"developer\" || @request.auth.role = \"owner\"",
    "name": "omni_chat_messages",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id = user || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"developer\"",
    "viewRule": "@request.auth.id = user || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"developer\" || @request.auth.role = \"owner\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3248317036");

  return app.delete(collection);
})
