# OrgaFlow - System Map & Architektur

## Tech Stack
- **Frontend:** SvelteKit, TypeScript, Tailwind CSS
- **Backend & Database:** PocketBase (lokal via `./pocketbase serve` auf Port 8090)
- **Microservices:** Node.js Express Server (Port 3000) für E-Mail (SMTP/IMAP), VMA-Export & Push
- **AI Integrations:** Gemini API (@google/genai) serverseitig

## Schlüsselpfade
- `src/lib/types/`: Zentrales Typensystem (Budget, Klienten, Portal, Admin)
- `src/lib/components/`: Wiederverwendbare UI-Module (Haushaltsbuch, Bottom-Sheets, Touch-Cards)
- `src/lib/services/`: Parser, Dokumenten-Engine, Toasts, Formatierer
- `src/routes/api/`: SvelteKit Server-Endpunkte & Proxy-Routen
