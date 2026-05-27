// PocketBase Hook (Speichern unter: pb_hooks/main.pb.js im PocketBase Ordner)
// Verbindet das automatische PocketBase Log-System mit deinem OrgaFlow Log-Terminal

routerAdd("GET", "/api/orgaflow/logs", (c) => {
    // Nur Superadmins dürfen die Logs abrufen
    const authRecord = c.get("authRecord");
    if (!authRecord || authRecord.collection().name !== "_superusers") {
        throw new ForbiddenError("Nur Administratoren haben Zugriff auf die System-Logs.");
    }
    
    const page = parseInt(c.queryParam("page")) || 1;
    const perPage = parseInt(c.queryParam("perPage")) || 1000;
    const offset = (page - 1) * perPage;

    const result = arrayOf(new DynamicModel({
        "id": "", "created": "", "method": "", "url": "", "message": "", "level": 0, "data": {}, "userIp": ""
    }));

    // Fragt die interne Log-Tabelle von PocketBase ab (Inkludiert Logins, Änderungen etc.)
    $app.logsDao().db()
        .newQuery("SELECT id, created, method, url, message, level, data, userIp FROM _requests ORDER BY created DESC LIMIT {:limit} OFFSET {:offset}")
        .bind({ limit: perPage, offset: offset })
        .all(result);

    return c.json(200, { page: page, perPage: perPage, items: result });
});