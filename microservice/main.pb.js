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

    // Filter-Parameter aus der URL auslesen
    const level = c.queryParam("level");
    const search = c.queryParam("search");

    let query = "SELECT id, created, method, url, message, level, data, userIp FROM _requests";
    const whereClauses = [];
    const bindings = { limit: perPage, offset: offset };

    if (level && level !== '') {
        whereClauses.push("level = {:level}");
        bindings.level = parseInt(level);
    }

    if (search && search !== '') {
        // Suche in mehreren relevanten Feldern
        whereClauses.push("(url LIKE {:search} OR message LIKE {:search} OR userIp LIKE {:search})");
        bindings.search = '%' + search + '%';
    }

    if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY created DESC LIMIT {:limit} OFFSET {:offset}";

    const result = arrayOf(new DynamicModel({
        "id": "", "created": "", "method": "", "url": "", "message": "", "level": 0, "data": {}, "userIp": ""
    }));

    $app.logsDao().db().newQuery(query).bind(bindings).all(result);

    // Gesamtzahl der gefilterten Einträge für die Paginierung ermitteln
    let totalQuery = "SELECT COUNT(*) as total FROM _requests";
    const totalBindings = { ...bindings };
    delete totalBindings.limit;
    delete totalBindings.offset;

    if (whereClauses.length > 0) {
        totalQuery += " WHERE " + whereClauses.join(" AND ");
    }
    
    const totalResult = new DynamicModel({ "total": 0 });
    $app.logsDao().db().newQuery(totalQuery).bind(totalBindings).one(totalResult);
    
    const totalItems = totalResult.total;
    const totalPages = Math.ceil(totalItems / perPage);

    return c.json(200, { 
        page: page, 
        perPage: perPage, 
        items: result,
        totalItems: totalItems,
        totalPages: totalPages
    });
});