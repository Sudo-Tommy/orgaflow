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
