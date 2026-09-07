// pb_hooks/main.pb.js
routerAdd("GET", "/api/orgaflow/logs", (c) => {
    // PocketBase v0.23+ nutzt c.auth, ältere Versionen nutzten c.get("authRecord")
    const authRecord = c.auth || (typeof c.get === 'function' ? c.get("authRecord") : null);

    if (!authRecord) {
        throw new ForbiddenError("Zugriff verweigert: Sie sind nicht eingeloggt.");
    }

    // Kollektionsname sicher auslesen (abwärts- und aufwärtskompatibel)
    const collName = typeof authRecord.collectionName === 'function' ? authRecord.collectionName() : authRecord.collection().name;

    // 1. Sicherheit: Echte PB-Admins ODER OrgaFlow-Admins mit Rolle "superadmin" zulassen
    const isRealSuperuser = collName === "_superusers";
    const isAppSuperadmin = collName === "users" && authRecord.getString("role") === "superadmin";

    if (!isRealSuperuser && !isAppSuperadmin) {
        throw new ForbiddenError("Zugriff verweigert: Ihr Account hat nicht die 'superadmin' Rolle.");
    }

    const page = parseInt(c.queryParam("page")) || 1;
    const perPage = parseInt(c.queryParam("perPage")) || 1000;
    const offset = (page - 1) * perPage;

    // 2. Direkter Zugriff auf die Request-Logs statt der System-Logs
    const requestLogs = arrayOf(new DynamicModel({
        "id": "", "created": "", "updated": "", "url": "", "method": "", "status": 0,
        "auth": "", "remoteIp": "", "referer": "", "userAgent": "", "meta": {},
    }));

    $app.dao().db()
        .newQuery("SELECT * FROM _requests ORDER BY created DESC LIMIT {:limit} OFFSET {:offset}")
        .bind({ limit: perPage, offset: offset })
        .all(requestLogs);

    // 3. Transformiert die Daten in das Format, das das Frontend erwartet (ähnlich der _logs Collection)
    const transformedLogs = requestLogs.map(log => {
        const meta = log.meta || {};
        let authId = "";
        if (meta.authRecord) {
            authId = meta.authRecord.id;
        }

        return {
            id: log.id,
            created: log.created,
            message: log.url, // URL als Fallback-Nachricht
            level: 0,
            data: {
                url: log.url,
                method: log.method,
                status: log.status,
                auth: log.auth,
                remoteIp: log.remoteIp,
                userIp: log.remoteIp, // Alias für das Frontend
                referer: log.referer,
                userAgent: log.userAgent,
                authId: authId,
                execTime: meta.requestDuration || 0,
            }
        };
    });

    let totalVisits = 0;
    try {
        const result = new DynamicModel({ "count": 0 });
        $app.dao().db().newQuery("SELECT COUNT(DISTINCT remoteIp) as count FROM _requests").one(result);
        totalVisits = result.count;
    } catch(e) {}

    return c.json(200, { items: transformedLogs, totalVisits: totalVisits });
});

// 1-Tap Session Kill Switch (Invalidiert alle aktiven JWT-Tokens durch Reset des tokenKey)
routerAdd("POST", "/api/orgaflow/auth/kill-session", (c) => {
    const authRecord = c.auth || (typeof c.get === 'function' ? c.get("authRecord") : null);
    if (!authRecord) {
        throw new ForbiddenError("Zugriff verweigert: Sie sind nicht eingeloggt.");
    }

    const collName = typeof authRecord.collectionName === 'function' ? authRecord.collectionName() : authRecord.collection().name;
    const isRealSuperuser = collName === "_superusers";
    const isAppAdmin = collName === "users" && (authRecord.getString("role") === "superadmin" || authRecord.getString("role") === "admin");

    let targetUserId = "";
    try {
        const body = $apis.requestInfo(c).data || {};
        targetUserId = body.userId || "";
    } catch(e) {}

    if (!targetUserId) {
        targetUserId = authRecord.id;
    }

    if (targetUserId !== authRecord.id && !isRealSuperuser && !isAppAdmin) {
        throw new ForbiddenError("Zugriff verweigert: Unzureichende Berechtigung zum Beenden fremder Sitzungen.");
    }

    try {
        const user = $app.dao().findRecordById("users", targetUserId);
        if (!user) {
            return c.json(404, { error: "Benutzer nicht gefunden." });
        }

        // Neuer Token-Key invalidiert sofort alle existierenden Sessions
        const newTokenKey = $security.randomString(50);
        user.set("tokenKey", newTokenKey);
        $app.dao().saveRecord(user);

        // System-Audit-Log eintragen
        try {
            const auditColl = $app.dao().findCollectionByNameOrId("audit_logs");
            if (auditColl) {
                const logRec = new Record(auditColl);
                const callerName = authRecord.getString("name_first") 
                    ? (authRecord.getString("name_first") + " " + authRecord.getString("name_last")).trim() 
                    : (authRecord.getString("username") || authRecord.getString("email") || "Admin");

                logRec.set("user_name", callerName);
                logRec.set("user_role", authRecord.getString("role") || "user");
                logRec.set("action", "SECURITY_KILL_SESSION");
                logRec.set("route", "/api/orgaflow/auth/kill-session");
                logRec.set("details", "Sitzung widerrufen für Benutzer: " + targetUserId + " (" + (user.getString("email") || user.getString("username")) + ")");
                $app.dao().saveRecord(logRec);
            }
        } catch (logErr) {
            console.warn("Audit-Log Warnung bei Session-Kill:", logErr);
        }

        return c.json(200, { success: true, message: "Sitzung(en) erfolgreich beendet und Tokens widerrufen." });
    } catch (err) {
        return c.json(500, { error: "Fehler beim Beenden der Sitzung: " + err.message });
    }
});

// Universeller Audit-Logging-Endpunkt
routerAdd("POST", "/api/orgaflow/audit/log", (c) => {
    const authRecord = c.auth || (typeof c.get === 'function' ? c.get("authRecord") : null);
    if (!authRecord) {
        throw new ForbiddenError("Nicht authentifiziert");
    }

    let data = {};
    try {
        data = $apis.requestInfo(c).data || {};
    } catch(e) {}

    try {
        const auditColl = $app.dao().findCollectionByNameOrId("audit_logs");
        if (auditColl) {
            const logRec = new Record(auditColl);
            const userName = authRecord.getString("name_first") 
                ? (authRecord.getString("name_first") + " " + authRecord.getString("name_last")).trim() 
                : (authRecord.getString("username") || authRecord.getString("email") || "Unbekannt");

            logRec.set("user_name", data.user_name || userName);
            logRec.set("user_role", data.user_role || authRecord.getString("role") || "user");
            logRec.set("action", data.action || "ACTION");
            logRec.set("route", data.route || c.request().url.path);
            logRec.set("details", typeof data.details === 'object' ? JSON.stringify(data.details) : (data.details || ""));
            $app.dao().saveRecord(logRec);
            return c.json(200, { success: true });
        }
    } catch (e) {
        console.warn("Fehler beim Erstellen des Audit-Logs:", e);
        return c.json(500, { error: e.message });
    }
    return c.json(400, { error: "Collection audit_logs nicht gefunden" });
});
