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

// Serverseitige Datenminimierung: Fremde Fahrzeugbuchungen maskieren
onRecordEnrich((e) => {
    e.next();

    const rec = e.record;
    if (!rec) return;

    const title = (rec.getString("title") || "").toLowerCase();
    const desc = (rec.getString("description") || "").toLowerCase();
    const fullText = title + " " + desc;

    const isCar = (
        fullText.includes("booking tarif flex") ||
        fullText.includes("teilauto-buchung") ||
        fullText.includes("teilauto buchung") ||
        fullText.includes("teilauto") ||
        fullText.includes("tarif flex") ||
        (fullText.includes("booking") && fullText.includes("flex")) ||
        fullText.includes("carsharing")
    );

    if (!isCar) return;

    const authRecord = e.requestInfo ? e.requestInfo.auth : null;
    let isSuperuser = false;
    let isOwner = false;

    if (authRecord) {
        const collName = typeof authRecord.collectionName === 'function' ? authRecord.collectionName() : (authRecord.collection ? authRecord.collection().name : "");
        isSuperuser = collName === "_superusers" || authRecord.getString("role") === "superadmin";
        const appUserId = rec.getString("user");
        isOwner = Boolean(appUserId && appUserId === authRecord.id);
    }

    // Wenn weder Eigentümer noch Superadmin: Fremde Fahrzeugbuchung anonymisieren
    if (!isSuperuser && !isOwner) {
        rec.set("title", "Fahrzeug reserviert");
        rec.set("description", "Fahrzeug belegt");
        try {
            rec.hide("client", "tasks", "expenditures", "drive_record", "notes", "report", "requestet_changes");
        } catch (hErr) {}

        try {
            const exp = rec.expand();
            if (exp) {
                delete exp["client"];
                delete exp["tasks"];
                delete exp["expenditures"];
                delete exp["drive_record"];
            }
        } catch (expErr) {}
    }
}, "appointments");

// ==========================================
// MITARBEITERPORTAL: QR-CODE SCHNELLZUGANG & TOKEN MANAGEMENT
// ==========================================

// 1. QR-Code / Direktlink Schnell-Login
routerAdd("POST", "/api/orgaflow/auth/employee-token", (c) => {
    let body = {};
    try {
        body = $apis.requestInfo(c).data || {};
    } catch(e) {}

    const token = (body.token || "").trim();
    if (!token) {
        throw new BadRequestError("Zugriffs-Token fehlt.");
    }

    // Suche Benutzer mit diesem Token
    const userModel = new DynamicModel({
        "id": "", "email": "", "username": "", "role": "", "status": "", "quick_access_token": "", "token_expires_at": ""
    });

    try {
        $app.dao().db()
            .newQuery("SELECT id, email, username, role, status, quick_access_token, token_expires_at FROM users WHERE quick_access_token = {:token} LIMIT 1")
            .bind({ token: token })
            .one(userModel);
    } catch(e) {
        throw new BadRequestError("Ungültiger oder nicht gefundener Schnellzugriffs-Token.");
    }

    if (!userModel.id) {
        throw new BadRequestError("Ungültiger Schnellzugriffs-Token.");
    }

    // Status-Check (Inaktiv / Gesperrt?)
    if (userModel.status === "Inaktiv") {
        throw new ForbiddenError("Dieser Mitarbeiter-Account ist derzeit inaktiv geschaltet.");
    }

    // Gültigkeits-Check (Ablaufdatum)
    if (userModel.token_expires_at) {
        const expiryTime = new Date(userModel.token_expires_at).getTime();
        if (!isNaN(expiryTime) && expiryTime < Date.now()) {
            throw new BadRequestError("Dieser QR-Code-Zugang ist abgelaufen. Bitte fordern Sie einen neuen Link bei der Administration an.");
        }
    }

    const fullUser = $app.dao().findRecordById("users", userModel.id);
    if (!fullUser) {
        throw new NotFoundError("Mitarbeiterprofil nicht gefunden.");
    }

    // Audit-Log für GoBD & DSGVO Nachvollziehbarkeit
    try {
        const auditColl = $app.dao().findCollectionByNameOrId("audit_logs");
        if (auditColl) {
            const logRec = new Record(auditColl);
            const fullName = (fullUser.getString("name_first") + " " + fullUser.getString("name_last")).trim() || fullUser.getString("email");
            logRec.set("user_name", fullName);
            logRec.set("user_role", fullUser.getString("role") || "employee");
            logRec.set("action", "EMPLOYEE_QR_LOGIN");
            logRec.set("route", "/api/orgaflow/auth/employee-token");
            logRec.set("details", "Erfolgreicher mobiler Schnellzugriff via QR-Code Token für " + fullName + " (" + fullUser.id + ")");
            $app.dao().saveRecord(logRec);
        }
    } catch (logErr) {
        console.warn("Audit-Log Fehler bei Employee-QR-Login:", logErr);
    }

    // Standardisierte PocketBase Auth-Response zurückgeben
    return $apis.recordAuthResponse(c, fullUser, "qr_quick_access");
});

// 2. Admin: QR-Zugangs-Token generieren mit konfigurierbarer Gültigkeit
routerAdd("POST", "/api/orgaflow/employees/generate-token", (c) => {
    const authRecord = c.auth || (typeof c.get === 'function' ? c.get("authRecord") : null);
    if (!authRecord) {
        throw new ForbiddenError("Zugriff verweigert: Bitte als Administrator anmelden.");
    }

    const collName = typeof authRecord.collectionName === 'function' ? authRecord.collectionName() : authRecord.collection().name;
    const isSuperuser = collName === "_superusers";
    const role = authRecord.getString("role");
    const isAdmin = isSuperuser || role === "superadmin" || role === "owner" || role === "admin";

    if (!isAdmin) {
        throw new ForbiddenError("Zugriff verweigert: Nur Administratoren dürfen QR-Zugangs-Tokens generieren.");
    }

    let data = {};
    try {
        data = $apis.requestInfo(c).data || {};
    } catch(e) {}

    const targetUserId = data.userId;
    if (!targetUserId) {
        throw new BadRequestError("Benutzer-ID fehlt.");
    }

    const targetUser = $app.dao().findRecordById("users", targetUserId);
    if (!targetUser) {
        throw new NotFoundError("Zielbenutzer nicht gefunden.");
    }

    // Gültigkeit in Stunden (Standard: 7 Tage = 168h, oder konfigurierbar)
    const validityHours = parseInt(data.validityHours) || (7 * 24);
    let expiresAtIso = "";
    if (validityHours > 0) {
        const d = new Date(Date.now() + validityHours * 3600 * 1000);
        expiresAtIso = d.toISOString().replace("T", " ").substring(0, 19) + "Z";
    }

    // Kryptografisch sicheres Token (48 Zeichen)
    const token = $security.randomString(48);

    targetUser.set("quick_access_token", token);
    targetUser.set("token_expires_at", expiresAtIso);
    $app.dao().saveRecord(targetUser);

    // Audit-Log
    try {
        const auditColl = $app.dao().findCollectionByNameOrId("audit_logs");
        if (auditColl) {
            const logRec = new Record(auditColl);
            const callerName = (authRecord.getString("name_first") + " " + authRecord.getString("name_last")).trim() || authRecord.getString("email") || "Admin";
            logRec.set("user_name", callerName);
            logRec.set("user_role", authRecord.getString("role") || "admin");
            logRec.set("action", "EMPLOYEE_TOKEN_GENERATED");
            logRec.set("route", "/api/orgaflow/employees/generate-token");
            logRec.set("details", "Neuer QR-Zugangslink erstellt für " + (targetUser.getString("email") || targetUser.id) + " mit Gültigkeit bis " + (expiresAtIso || "unbegrenzt"));
            $app.dao().saveRecord(logRec);
        }
    } catch (e) {}

    return c.json(200, {
        success: true,
        token: token,
        expiresAt: expiresAtIso,
        userId: targetUserId
    });
});

// 3. Admin: QR-Zugangs-Token sofort widerrufen (Revoke)
routerAdd("POST", "/api/orgaflow/employees/revoke-token", (c) => {
    const authRecord = c.auth || (typeof c.get === 'function' ? c.get("authRecord") : null);
    if (!authRecord) {
        throw new ForbiddenError("Zugriff verweigert.");
    }

    let data = {};
    try {
        data = $apis.requestInfo(c).data || {};
    } catch(e) {}

    const targetUserId = data.userId;
    if (!targetUserId) {
        throw new BadRequestError("Benutzer-ID fehlt.");
    }

    const targetUser = $app.dao().findRecordById("users", targetUserId);
    if (!targetUser) {
        throw new NotFoundError("Zielbenutzer nicht gefunden.");
    }

    targetUser.set("quick_access_token", "");
    targetUser.set("token_expires_at", "");
    $app.dao().saveRecord(targetUser);

    return c.json(200, {
        success: true,
        message: "QR-Zugang erfolgreich widerrufen."
    });
});
