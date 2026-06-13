# NITROBAHN — Start-Anleitung (Deutsch)

Diese Anleitung bringt dich Schritt für Schritt von „ZIP heruntergeladen" bis
„läuft auf meinem PC" und erklärt danach, wie du online gehst.

---

## Erst das Wichtigste: Es gibt ZWEI Server

| | Was es ist | Bekommst du hier? |
|---|---|---|
| **1. Die Webseite** (dieses Projekt) | Login, Bestenliste, Profil, News — das, was man im Browser sieht | ✅ fertig, läuft sofort |
| **2. Der Spiel-Server** (SBRW) | Das, womit sich `nfsw.exe` verbindet, damit man **wirklich fährt** | ⚙️ separat — Anleitung in Teil D |

Damit du **auf der Seite klickst**, brauchst du nur Teil A.
Damit du **das Spiel fährst**, brauchst du zusätzlich Teil D.
Empfehlung: erst die Webseite lokal zum Laufen bringen (10 Min), dann später den Spiel-Server.

---

## Teil A — Webseite auf deinem PC starten (Windows)

### 1. Node.js installieren
- Auf <https://nodejs.org> die **LTS-Version** laden und installieren (einfach „Weiter" klicken).
- Prüfen: **Windows-Taste → „cmd" → Eingabeaufforderung** öffnen, eintippen:
  ```
  node -v
  ```
  Kommt eine Versionsnummer (z. B. `v22.x`), passt alles.

### 2. Projekt entpacken
- `nfsw-portal.zip` mit Rechtsklick → **„Alle extrahieren"** entpacken, z. B. nach `C:\nfsw-portal`.

### 3. Eingabeaufforderung im Projektordner öffnen
- Im entpackten Ordner oben in die **Adressleiste** des Explorers klicken, `cmd` eintippen, Enter.
  (Damit öffnet sich die Eingabeaufforderung direkt in diesem Ordner.)

### 4. Installieren, befüllen, starten
Nacheinander eingeben (jeweils Enter, warten bis fertig):
```
npm install
npm run seed
npm start
```
- `npm install` lädt die Bausteine (dauert beim ersten Mal 1–2 Min).
- `npm run seed` legt 60 Demo-Fahrer + ein Testkonto an.
- `npm start` startet den Server. Es erscheint:
  `NFSW Portal running -> http://localhost:8080`

### 5. Seite öffnen
- Browser auf **<http://localhost:8080>**.
- **Test-Login:** E-Mail `demo@nfsw.local`, Passwort `speed123`.
  Nach dem Login wird die Startseite zu deiner Fahrer-Karte mit Rang.

> **Stoppen:** in der Eingabeaufforderung `Strg + C`.
> **Wieder starten:** erneut `npm start` (install/seed nur beim ersten Mal nötig).

### Optional: vom Handy / anderen PC im selben WLAN testen
- Deine lokale IP finden: in der Eingabeaufforderung `ipconfig` → „IPv4-Adresse", z. B. `192.168.0.42`.
- Am anderen Gerät im Browser: `http://192.168.0.42:8080`
- Klappt es nicht, lässt die Windows-Firewall Node evtl. nicht durch → beim ersten Start „Zugriff zulassen" wählen.

---

## Teil B — Webseite kostenlos online stellen

Damit andere die Seite **im Internet** erreichen (nicht nur in deinem WLAN):

### Empfehlung: Render (einziger echter Dauer-Gratis-Tier, Stand 2026)
1. Code zu GitHub hochladen (siehe Teil C).
2. Auf <https://render.com> kostenlos anmelden, **New → Web Service**, dein GitHub-Repo wählen.
3. Build Command: `npm install` · Start Command: `npm start`.
4. Render gibt dir eine öffentliche Adresse wie `https://nitrobahn.onrender.com`.

**Zwei Haken beim Gratis-Tier:**
- Die Seite **schläft nach 15 Min ohne Besucher** ein; der erste Aufruf danach dauert ~30–50 Sek.
- Das Dateisystem wird beim Neustart zurückgesetzt → die **SQLite-Datei (und damit Konten/Bestenliste) gehen verloren.**
  Für echten Dauerbetrieb darum eine **richtige Datenbank** nehmen: entweder Render/Railway-Postgres, oder gleich die **MySQL-DB deines Spiel-Servers** (siehe README, Abschnitt „Going live"). Solange du nur testest, reicht SQLite.

### Alternativen
- **Railway** (<https://railway.com>): sehr einfach, aber kein Dauer-Gratis-Tier mehr — ~5 $/Monat nach Startguthaben. Dafür **MySQL/Postgres mit einem Klick** dabei.
- **Nur das Schaufenster** (die Datei `nfsw-portal-preview.html`, ohne Login/echte Daten) kannst du **dauerhaft 100 % kostenlos** über **GitHub Pages** oder **Netlify** online stellen.

---

## Teil C — Auf GitHub hochladen

**Wichtig zum Verständnis:** Der Server **läuft nicht „auf GitHub".** GitHub ist nur
der Ort, wo der **Quellcode** liegt — zum Sichern, Versionieren und Teilen. Die
anderen NFSW-Server haben ihren *Code* auf GitHub (z. B. der SBRW-Core), aber
*laufen* tun sie auf einem eigenen Server/VPS. Render/Railway holen sich den Code
**von GitHub** und führen ihn dann aus.

Trotzdem sinnvoll — so geht's:
1. Auf <https://github.com> Konto anlegen, **New repository** → Name z. B. `nfsw-portal`.
2. Am einfachsten mit **GitHub Desktop** (<https://desktop.github.com>): „Add Local Repository" → deinen Projektordner wählen → „Publish".
3. Oder per Eingabeaufforderung im Projektordner:
   ```
   git init
   git add .
   git commit -m "NITROBAHN Portal"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/nfsw-portal.git
   git push -u origin main
   ```
> Die Datei `.gitignore` solltest du anlegen, damit `node_modules/`, `data/` und
> `.env` **nicht** mit hochgeladen werden (Geheimnisse gehören nicht auf GitHub).

---

## Teil D — Der echte Spiel-Server (damit man WIRKLICH fährt)

Das ist der größere Brocken und ein **eigenes Setup**. Was du dafür brauchst:

1. **Java 8 (JDK)** — Laufzeit für den Server.
2. **MySQL oder MariaDB** — die Spieldatenbank.
3. **Openfire (XMPP)** — für Chat/Präsenz im Spiel.
4. **soapbox-race-core** — der eigentliche Spiel-Server.
   - Fertige Variante zum schnellen Start: **SBRW-COMPILED** → <https://github.com/0P3N50URC3-F0R3V3R>
   - Quellcode: <https://github.com/SoapboxRaceWorld/soapbox-race-core>
   - Beste Schritt-für-Schritt-Anleitung: <https://github.com/berkayylmao/setting-up-sbrw>
5. **NFS:World-Spieldateien + Community-Launcher** (GameLauncher) auf dem **Spieler-PC**.

### Lokal testen
Du kannst den Spiel-Server auch erst auf deinem eigenen PC laufen lassen und
allein darauf fahren — genau dafür ist die `setting-up-sbrw`-Anleitung gedacht.

### Online für andere Spieler — kostenlose Option
Ein Spiel-Server braucht **dauerhaft Strom, RAM und offene Ports** — kostenlose
Webseiten-Hoster (Render & Co.) reichen dafür **nicht**. Realistisch gratis ist nur:
- **Oracle Cloud — Always Free**: bis zu **4 ARM-Kerne + 24 GB RAM**, dauerhaft kostenlos,
  genug für SBRW + MySQL + Openfire. (Konto braucht Kreditkarte zur Prüfung, wird aber nicht belastet; in beliebten Regionen manchmal „out of capacity" → anderes Rechenzentrum wählen.)
- Günstige Alternative ohne Bastelei: ein kleiner **VPS** (z. B. Hetzner ab ~4 €/Monat).

### Login: Webseite + Spiel verbinden
Wenn der Spiel-Server steht, kann die Webseite **dieselbe MySQL-Datenbank** nutzen
— dann zeigt die Bestenliste echte Fahrer und Spieler loggen sich mit ihrem
Spielkonto ein. Wie du umstellst, steht in der **README** unter „Going live".

---

## Empfohlene Reihenfolge

1. **Teil A** — Webseite lokal starten ✅ (hast du gleich)
2. Branding/Design anpassen, Inhalte mit eigenen Texten füllen
3. **Teil C** — Code auf GitHub sichern
4. **Teil D lokal** — Spiel-Server auf dem eigenen PC, allein testen
5. **Online gehen** — Webseite auf Render, Spiel-Server auf Oracle Cloud / VPS,
   beide an dieselbe MySQL-DB hängen
