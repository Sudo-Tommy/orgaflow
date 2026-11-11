/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const nowIso = new Date().toISOString();
    const records = app.findRecordsByFilter(
      "appointments",
      `status = 'beendet' && appointment > '${nowIso}' && settled != true`
    );
    for (const rec of records) {
      rec.set("status", "geplant");
      app.save(rec);
    }
  } catch (e) {
    console.error("[Migration] Error cleaning up future appointments:", e);
  }
}, (app) => {});
