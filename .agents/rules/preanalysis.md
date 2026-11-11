# Fast-Path Vorabanalyse & Integrations-Routine

Um zeitaufwändige Komplettanalysen und wiederholte Datei-Scans des Gesamtsystems vollständig zu vermeiden, nutzt der Agent die komprimierte Architektur-Referenz `.agents/SYSTEM_MAP.md` als primären Index.

## Verbindliche Routine:
1. **Blitz-Lokalisierung via SYSTEM_MAP:**
   Der Agent gleicht die Benutzeranfrage direkt mit der `.agents/SYSTEM_MAP.md` ab, um den exakten Integrationsort (Route, Modal, Subkomponente, Service oder Store) und die betroffenen Schnittstellen in Sekundenschnelle ohne rekursives Suchen zu identifizieren.
2. **Prägnante Nennung (1–2 Sätze):**
   Vor der Code-Ausgabe nennt der Agent kurz und bündig den gewählten Integrationspunkt sowie die Begründung. Ausführliche System-Erklärungen oder redundante Analysetexte entfallen.
3. **Direkte & chirurgische Umsetzung:**
   Unmittelbar nach der Kurznennung wird die Änderung direkt in der Zielkomponente vorgenommen.
4. **Vollständige Modulstruktur:**
   Jedes geänderte Modul wird stets vollständig ohne Auslassungen ausgegeben und hält proaktiv die 250-Zeilen-Grenze (`code-minimalism.md`) ein.
