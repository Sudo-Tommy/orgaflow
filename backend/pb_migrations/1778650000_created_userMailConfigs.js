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
        "id": "relation1234567890",
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
        "help": "SMTP server hostname (e.g., smtp.ionos.com)",
        "hidden": false,
        "id": "text1111111111",
        "max": 255,
        "min": 0,
        "name": "smtp_host",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "SMTP server port (e.g., 587 or 465)",
        "hidden": false,
        "id": "number2222222222",
        "max": "",
        "min": "",
        "name": "smtp_port",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "help": "SMTP username (usually email address)",
        "hidden": false,
        "id": "text3333333333",
        "max": 255,
        "min": 0,
        "name": "smtp_user",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "SMTP password (encrypted)",
        "hidden": true,
        "id": "text4444444444",
        "max": 0,
        "min": 0,
        "name": "smtp_password_encrypted",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "IMAP server hostname (e.g., imap.ionos.com)",
        "hidden": false,
        "id": "text5555555555",
        "max": 255,
        "min": 0,
        "name": "imap_host",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "IMAP server port (e.g., 993 or 143)",
        "hidden": false,
        "id": "number6666666666",
        "max": "",
        "min": "",
        "name": "imap_port",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "help": "Email address for this mailbox",
        "hidden": false,
        "id": "email7777777777",
        "max": 0,
        "min": 0,
        "name": "email_address",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "email"
      },
      {
        "hidden": false,
        "id": "autodate8888888888",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate9999999999",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "userMailConfigs001",
    "indexes": [
      "CREATE UNIQUE INDEX idx_userMailConfigs_user ON userMailConfigs(user)",
      "CREATE INDEX idx_userMailConfigs_email ON userMailConfigs(email_address)"
    ],
    "listRule": null,
    "name": "userMailConfigs",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("userMailConfigs001");

  return app.delete(collection);
});
