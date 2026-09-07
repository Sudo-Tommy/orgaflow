/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Appointments Collection Fields
  try {
    const appointments = app.findCollectionByNameOrId("oxbqk37n877m8bq");
    if (appointments) {
      if (!appointments.fields.getByName("google_event_id")) {
        appointments.fields.addAt(appointments.fields.length, new Field({
          "help": "Google Calendar Event ID",
          "hidden": false,
          "id": "text_google_event_id",
          "max": 255,
          "min": 0,
          "name": "google_event_id",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }));
      }
      if (!appointments.fields.getByName("google_event_link")) {
        appointments.fields.addAt(appointments.fields.length, new Field({
          "help": "Google Calendar Event Link (htmlLink)",
          "hidden": false,
          "id": "text_google_event_link",
          "max": 500,
          "min": 0,
          "name": "google_event_link",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }));
      }
      app.save(appointments);
    }
  } catch (e) {
    console.log("Migration appointments google fields check:", e);
  }

  // 2. User Calendar Configs Collection
  try {
    let configsCol = null;
    try {
      configsCol = app.findCollectionByNameOrId("user_calendar_configs");
    } catch (err) {}

    if (!configsCol) {
      const usersCol = app.findCollectionByNameOrId("_pb_users_auth_");
      const collection = new Collection({
        "id": "pbc_cal_configs",
        "name": "user_calendar_configs",
        "type": "base",
        "system": false,
        "listRule": "@request.auth.id = user.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'",
        "viewRule": "@request.auth.id = user.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'",
        "createRule": "@request.auth.id != ''",
        "updateRule": "@request.auth.id = user.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'",
        "deleteRule": "@request.auth.id = user.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'",
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
            "collectionId": usersCol ? usersCol.id : "_pb_users_auth_",
            "help": "Zugehöriger OrgaFlow Benutzer",
            "hidden": false,
            "id": "relation_user_cal",
            "maxSelect": 1,
            "minSelect": 1,
            "name": "user",
            "presentable": false,
            "required": true,
            "system": false,
            "type": "relation"
          },
          {
            "autogeneratePattern": "",
            "help": "Google Kalender E-Mail-Adresse",
            "hidden": false,
            "id": "text_google_email",
            "max": 255,
            "min": 0,
            "name": "google_email",
            "pattern": "",
            "presentable": true,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "Google OAuth Access Token",
            "hidden": true,
            "id": "text_access_token",
            "max": 4096,
            "min": 0,
            "name": "access_token",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "Google OAuth Refresh Token",
            "hidden": true,
            "id": "text_refresh_token",
            "max": 4096,
            "min": 0,
            "name": "refresh_token",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "help": "Token Ablauf-Zeitpunkt (Epoch ms)",
            "hidden": false,
            "id": "num_expiry_date",
            "max": null,
            "min": null,
            "name": "expiry_date",
            "onlyInt": true,
            "presentable": false,
            "required": false,
            "system": false,
            "type": "number"
          },
          {
            "autogeneratePattern": "",
            "help": "Google Kalender ID (z.B. primary)",
            "hidden": false,
            "id": "text_calendar_id",
            "max": 255,
            "min": 0,
            "name": "calendar_id",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "help": "Automatische Live-Synchronisation aktiviert",
            "hidden": false,
            "id": "bool_sync_enabled",
            "name": "sync_enabled",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          },
          {
            "autogeneratePattern": "",
            "help": "Letzter erfolgreicher Sync",
            "hidden": false,
            "id": "text_last_sync",
            "max": 50,
            "min": 0,
            "name": "last_sync",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "Benutzerdefinierte Google Client-ID (optional)",
            "hidden": true,
            "id": "text_client_id",
            "max": 500,
            "min": 0,
            "name": "client_id",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "Benutzerdefiniertes Google Client-Secret (optional)",
            "hidden": true,
            "id": "text_client_secret",
            "max": 500,
            "min": 0,
            "name": "client_secret",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          }
        ],
        "indexes": [
          "CREATE UNIQUE INDEX `idx_user_calendar_config` ON `user_calendar_configs` (`user`)"
        ]
      });
      app.save(collection);
    }
  } catch (e) {
    console.log("Migration user_calendar_configs check:", e);
  }
}, (app) => {
  try {
    const appointments = app.findCollectionByNameOrId("oxbqk37n877m8bq");
    if (appointments) {
      appointments.fields.removeById("text_google_event_id");
      appointments.fields.removeById("text_google_event_link");
      app.save(appointments);
    }
  } catch (e) {}

  try {
    const col = app.findCollectionByNameOrId("user_calendar_configs");
    if (col) app.delete(col);
  } catch (e) {}
});
