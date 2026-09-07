/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "createdby.id = @request.auth.id",
    "deleteRule": "createdby.id = @request.auth.id",
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
        "id": "text724990059",
        "max": 0,
        "min": 0,
        "name": "title",
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
        "id": "select1855809928",
        "maxSelect": 0,
        "name": "transaction_type",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "Einnahme",
          "Ausgabe"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number1735513964",
        "max": null,
        "min": null,
        "name": "amount_net",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select3278057665",
        "maxSelect": 0,
        "name": "tax_rate",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "0",
          "7",
          "19"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2375376167",
        "max": null,
        "min": null,
        "name": "amount_gross",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date1222445531",
        "max": "",
        "min": "",
        "name": "transaction_date",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text105650625",
        "max": 0,
        "min": 0,
        "name": "category",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text2980368679",
        "max": 0,
        "min": 0,
        "name": "account_number",
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
        "id": "select2069996022",
        "maxSelect": 0,
        "name": "payment_method",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "Banküberweisung",
          "Bar"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 0,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "Offen",
          "Bezahlt",
          "Überfälltig",
          "Storniert"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "file451153308",
        "maxSelect": 10,
        "maxSize": 0,
        "mimeTypes": null,
        "name": "receipt_file",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3332084752",
        "help": "",
        "hidden": false,
        "id": "relation2129315035",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "related_document",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation1188192992",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "createdby",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text18589324",
        "max": 0,
        "min": 0,
        "name": "notes",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_1281444126",
    "indexes": [],
    "listRule": "createdby.id = @request.auth.id",
    "name": "accounting_duplicate",
    "system": false,
    "type": "base",
    "updateRule": "createdby.id = @request.auth.id",
    "viewRule": "createdby.id = @request.auth.id"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1281444126");

  return app.delete(collection);
})
