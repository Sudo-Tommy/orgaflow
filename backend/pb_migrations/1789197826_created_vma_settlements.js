/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\")",
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
        "help": "Zugeordneter Mitarbeiter",
        "hidden": false,
        "id": "rel_btkniwd3",
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
        "help": "Abrechnungszeitraum (z. B. September 2026)",
        "hidden": false,
        "id": "text_d9fbo4d5",
        "max": 100,
        "min": 1,
        "name": "period",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "Abrechnungsjahr (z. B. 2026)",
        "hidden": false,
        "id": "num_ertguo1i",
        "max": 2100,
        "min": 2000,
        "name": "year",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "help": "Abrechnungsmonat (1-12, 0 für Jahresabrechnung)",
        "hidden": false,
        "id": "num_44nnj1r6",
        "max": 12,
        "min": 0,
        "name": "month",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "Gesamte gefahrene Kilometer",
        "hidden": false,
        "id": "num_s0qf8gjq",
        "max": null,
        "min": null,
        "name": "total_km",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "Gesamte Fahrtkosten (€)",
        "hidden": false,
        "id": "num_w2csehgl",
        "max": null,
        "min": null,
        "name": "total_travel_costs",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "Gesamter Verpflegungsmehraufwand VMA Netto (€)",
        "hidden": false,
        "id": "num_qzdw0vwe",
        "max": null,
        "min": null,
        "name": "total_vma",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "Gesamte Übernachtungskosten (€)",
        "hidden": false,
        "id": "num_wmmz54sm",
        "max": null,
        "min": null,
        "name": "total_accommodation",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "Gesamte Reisenebenkosten (€)",
        "hidden": false,
        "id": "num_lo2e7fbn",
        "max": null,
        "min": null,
        "name": "total_incidentals",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "Gesamter Erstattungs- bzw. Abrechnungsbetrag (€)",
        "hidden": false,
        "id": "num_0v8ryl4t",
        "max": null,
        "min": null,
        "name": "total_amount",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "Strukturierte Reisedaten und Tagessätze",
        "hidden": false,
        "id": "json_rfkp8o3z",
        "maxSize": 0,
        "name": "details",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "Abrechnungsstatus",
        "hidden": false,
        "id": "sel_3tjxftjz",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "entwurf",
          "eingereicht",
          "genehmigt",
          "abgerechnet"
        ]
      },
      {
        "help": "Betriebsprüfungssicheres PDF-Dokument",
        "hidden": false,
        "id": "file_osn22v2m",
        "maxSelect": 1,
        "maxSize": 10485760,
        "mimeTypes": [
          "application/pdf"
        ],
        "name": "pdf_file",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [],
        "type": "file"
      }
    ],
    "id": "pbc_1470912865",
    "indexes": [
      "CREATE INDEX idx_vma_settlements_user_period ON vma_settlements (user, year, month)"
    ],
    "listRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\")",
    "name": "vma_settlements",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\")",
    "viewRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.role = \"admin\" || @request.auth.role = \"superadmin\")"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1470912865");

  return app.delete(collection);
})
