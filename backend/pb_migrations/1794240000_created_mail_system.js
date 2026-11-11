/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // mail_templates collection
  try {
    const existingTemplates = app.findCollectionByNameOrId("mail_templates");
    if (!existingTemplates) {
      const templates = new Collection({
        name: "mail_templates",
        type: "base",
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: "titel", type: "text", required: true },
          { name: "betreff", type: "text", required: true },
          { name: "inhalt", type: "text", required: true },
          { name: "category", type: "text", required: false }
        ]
      });
      app.save(templates);
    }
  } catch {}

  // mail_logs collection
  try {
    const existingLogs = app.findCollectionByNameOrId("mail_logs");
    if (!existingLogs) {
      const logs = new Collection({
        name: "mail_logs",
        type: "base",
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: "empfaenger_id", type: "text", required: false },
          { name: "empfaenger_name", type: "text", required: false },
          { name: "empfaenger_email", type: "email", required: false },
          { name: "template_id", type: "text", required: false },
          { name: "betreff", type: "text", required: true },
          { name: "status", type: "select", values: ["gesendet", "fehler"], required: true },
          { name: "fehlermeldung", type: "text", required: false },
          { name: "gesendet_am", type: "date", required: false }
        ]
      });
      app.save(logs);
    }
  } catch {}
}, (app) => {
  try {
    const tpl = app.findCollectionByNameOrId("mail_templates");
    if (tpl) app.delete(tpl);
    const logs = app.findCollectionByNameOrId("mail_logs");
    if (logs) app.delete(logs);
  } catch {}
});

