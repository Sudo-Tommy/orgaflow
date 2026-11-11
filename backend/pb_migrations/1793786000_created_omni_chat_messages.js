/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "name": "omni_chat_messages",
    "type": "base",
    "listRule": "@request.auth.id = user || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"developer\" || @request.auth.role = \"owner\"",
    "viewRule": "@request.auth.id = user || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"developer\" || @request.auth.role = \"owner\"",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id = user || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"developer\"",
    "deleteRule": "@request.auth.id = user || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\" || @request.auth.role = \"developer\"",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "name": "id",
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "name": "user",
        "type": "relation",
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": false,
        "minSelect": 0,
        "maxSelect": 1,
        "required": true
      },
      {
        "name": "role",
        "type": "select",
        "values": ["user", "assistant"],
        "maxSelect": 1,
        "required": true
      },
      {
        "name": "text",
        "type": "text"
      },
      {
        "name": "action_link",
        "type": "json"
      },
      {
        "name": "attachments",
        "type": "file",
        "maxSelect": 5,
        "maxSize": 10485760
      },
      {
        "name": "rating",
        "type": "select",
        "values": ["up", "down"],
        "maxSelect": 1
      },
      {
        "name": "is_ticket_generated",
        "type": "bool"
      },
      {
        "name": "ticket_id",
        "type": "text"
      }
    ]
  });

  try {
    return app.save(collection);
  } catch (e) {
    // Falls bereits existiert, Migration überspringen
    return;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("omni_chat_messages");
    return app.delete(collection);
  } catch (e) {
    return;
  }
});

