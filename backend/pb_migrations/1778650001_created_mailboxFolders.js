/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
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
        "cascadeDelete": true,
        "collectionId": "_pb_users_auth_",
        "help": "Reference to the user",
        "hidden": false,
        "id": "relation1111111111",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "user",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "Folder name (e.g., INBOX, Sent, Drafts)",
        "hidden": false,
        "id": "text2222222222",
        "max": 255,
        "min": 0,
        "name": "folder_name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "Full IMAP folder path",
        "hidden": false,
        "id": "text3333333333",
        "max": 0,
        "min": 0,
        "name": "folder_path",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "Number of unread emails in this folder",
        "hidden": false,
        "id": "number4444444444",
        "max": "",
        "min": "0",
        "name": "unread_count",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "help": "Total number of emails in this folder",
        "hidden": false,
        "id": "number5555555555",
        "max": "",
        "min": "0",
        "name": "total_count",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate6666666666",
        "name": "last_synced",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate7777777777",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate8888888888",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "mailboxFolders0001",
    "indexes": [
      "CREATE UNIQUE INDEX idx_mailboxFolders_user_path ON mailboxFolders(user, folder_path)",
      "CREATE INDEX idx_mailboxFolders_last_synced ON mailboxFolders(last_synced)"
    ],
    "listRule": null,
    "name": "mailboxFolders",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("mailboxFolders0001");

  return app.delete(collection);
});
