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

   // 2. Ein dynamisches "virtuelles" Model erstellen, das dem Log-Format entspricht
    let logs = arrayOf(new DynamicModel({
        id:      "",
        created: "",
        message: "",
        level:   0,
        data:    {},
    }));

    let page = parseInt(c.queryParam("page")) || 1;
    let perPage = parseInt(c.queryParam("perPage")) || 1000;
    let offset = (page - 1) * perPage;

    $app.logQuery()
        .orderBy("created DESC")
        .limit(perPage)
        .offset(offset)
        .all(logs);

    let totalVisits = 0;
    try {
        let countResult = new DynamicModel({ count: 0 });
        $app.logQuery().select("COUNT(DISTINCT json_extract(data, '$.remoteIp')) as count").one(countResult);
        totalVisits = countResult.count;
    } catch(e) {}

    return c.json(200, { items: logs, totalVisits: totalVisits });
});
