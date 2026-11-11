export function getOAuthSuccessHtml(googleEmail) {
    return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Seniorenassistenz OrgaFlow – Google verknüpft</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#1e293b;}
.card{background:white;padding:2.5rem;border-radius:1.5rem;box-shadow:0 20px 25px -5px rgba(0,0,0,0.07);text-align:center;max-width:440px;border:1px solid #e2e8f0;}
.badge{display:inline-block;padding:.25rem .75rem;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:.75rem;font-weight:700;margin-bottom:.75rem;}
h1{font-size:1.25rem;font-weight:800;margin:0 0 .5rem;color:#0f172a;}p{font-size:.875rem;color:#64748b;margin:0 0 1rem;line-height:1.5;}.email{font-weight:700;color:#4338ca;}</style></head>
<body><div class="card"><div style="font-size:3rem;margin-bottom:.5rem;">✅</div>
<div class="badge">Seniorenassistenz OrgaFlow</div>
<h1>Google-Konto erfolgreich verbunden!</h1><p>Hinterlegt und gespeichert für <br><span class="email">${googleEmail || 'Ihr Google-Konto'}</span>.<br><br>Dieses Fenster schließt sich automatisch...</p></div>
<script>
if(window.opener){
    window.opener.postMessage({type:'GOOGLE_CALENDAR_CONNECTED',email:'${googleEmail}',appName:'Seniorenassistenz OrgaFlow'},'*');
    window.opener.postMessage({type:'GOOGLE_DRIVE_CONNECTED',email:'${googleEmail}',appName:'Seniorenassistenz OrgaFlow'},'*');
    setTimeout(()=>window.close(),1000);
}else{
    setTimeout(()=>{window.location.href='/dashboard?google_success=1';},1200);
}
</script></body></html>`;
}

export function getOAuthErrorHtml(error) {
    return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Seniorenassistenz OrgaFlow – Fehler</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#1e293b;}
.box{background:white;padding:2rem;border-radius:1rem;border:1px solid #fecdd3;text-align:center;max-width:400px;}</style></head>
<body><div class="box"><h2>❌ Verbindung fehlgeschlagen</h2><p>${error}</p>
<script>
if(window.opener){
    window.opener.postMessage({type:'GOOGLE_CALENDAR_ERROR',error:'${error}'},'*');
    window.opener.postMessage({type:'GOOGLE_DRIVE_ERROR',error:'${error}'},'*');
    setTimeout(()=>window.close(),2500);
}
</script></div></body></html>`;
}
