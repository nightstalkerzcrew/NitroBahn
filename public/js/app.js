// ── NITROBAHN Frontend (DE) ──────────────────────────────────────────────────
// Hash-Router mit mehreren Unterseiten. Spricht mit der Express-API; ist diese
// nicht erreichbar (z. B. statische Vorschau), wird auf Demo-Daten zurückgefallen.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const state = { me: null, sort: 'reputation', search: '' };

// ── Helfer ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('de-DE'));
function flag(cc) {
  if (!cc || cc.length !== 2 || cc === 'XX') return '🏁';
  const A = 0x1f1e6;
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65));
}
const initials = (n) => (n || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function api(path, opts) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Anfrage fehlgeschlagen'), { data });
  return data;
}

// ── Demo-Daten (nur ohne Backend) ────────────────────────────────────────────
const DEMO = (() => {
  const base = [
    ['Vyper','DE','NOS Kartell',60,142300,341,820,540],['Nakamura','JP','Kanjo Crew',59,138900,352,790,505],
    ['SaintNova','FR','Minuit',58,131200,330,760,498],['BoostedBjorn','SE','Nordlys',56,124800,322,710,470],
    ['QuattroQueen','AT','Alpenglut',55,121050,318,690,455],['ApexAde','BR','Favela GT',53,114600,309,640,430],
    ['Mileena','PL','Nocny Zjazd',52,109900,305,620,410],['GripGandalf','NZ','Southern Drift',50,103200,298,560,388],
    ['Volkan','TR','Bogaz',49,99800,301,540,372],['RedlineRiya','IN','Mumbai Maniax',47,93400,289,500,350],
    ['Sokol','CZ','Praha Predators',45,88100,284,470,331],['NitroNoor','NL','Polder Pace',44,84600,279,450,318],
    ['Cinder','US','Midnight Society',42,79200,292,420,300],['Tarmacchiato','IT','Notte Veloce',41,75900,275,400,288],
    ['ZephyrZoe','CA','Frostbite',39,70300,268,370,266],['Halcyon','GB','Albion Apex',38,66800,271,350,250],
    ['Mateo','ES','Madrugada',36,61200,260,320,232],['IcyIvar','NO','Fjord Fury',34,56700,255,300,214],
    ['DriftDmitri','RU','Sibir Slide',33,53400,263,285,205],['LumenLukas','DE','NOS Kartell',31,48900,251,260,188],
    ['Suvi','FI','Aurora',29,43600,247,235,170],['CobraCaio','PT','Lisboa Lunatics',27,39100,242,210,154],
    ['Yara','EG','Cairo Cobras',25,34800,238,185,140],['SilkSeo','KR','Seoul Surge',23,30200,245,160,124],
    ['BlitzBruno','CH','Alpenglut',20,24900,232,130,104],
  ];
  return base.map((r, i) => ({
    rank: i + 1, name: r[0], country: r[1], crew: r[2], level: r[3],
    reputation: r[4], topSpeedKmh: r[5], distanceKm: r[6], racesWon: r[7],
    racesTotal: Math.round(r[7] / 0.62), winRate: 62 - (i % 9),
  }));
})();
const demoStatus = () => ({ online: 30 + Math.round(Math.random() * 18), drivers: DEMO.length, racesTotal: 18420, distanceKm: 642300, topSpeedKmh: 341 });
function demoSort(rows, sort) {
  const key = { reputation: 'reputation', top_speed: 'topSpeedKmh', wins: 'racesWon', distance: 'distanceKm' }[sort];
  return [...rows].sort((a, b) => b[key] - a[key]).map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Statische Inhalte der Unterseiten ────────────────────────────────────────
const CARS = [
  ['BMW M3 GTR', 'E46', 'S', 'Heck', 332, 'Die Legende aus der Verfolgungsjagd. Roh, laut, unverwechselbar.'],
  ['Lamborghini Murciélago LP 670-4 SV', '', 'S', 'Allrad', 342, 'Brachiale Höchstgeschwindigkeit für lange Gerade.'],
  ['Porsche 911 GT2', '997', 'S', 'Heck', 329, 'Spitz, schnell, gnadenlos in engen Kurven.'],
  ['Nissan Skyline GT-R', 'R34', 'A', 'Allrad', 311, 'Tuner-Ikone mit endlosem Setup-Potenzial.'],
  ['Audi R8', 'V10', 'A', 'Allrad', 316, 'Gutmütig bei hohem Tempo, ideal zum Einsteigen in Klasse A.'],
  ['Mitsubishi Lancer Evolution X', '', 'B', 'Allrad', 295, 'Allrad-Grip pur — verzeiht Fehler im Regen.'],
  ['Subaru Impreza WRX STI', '', 'B', 'Allrad', 291, 'Rallye-Gene, stark auf kurvigen Stadtstrecken.'],
  ['Chevrolet Camaro SS', '', 'B', 'Heck', 287, 'Muscle-Car-Drehmoment, perfekt für Drift-Events.'],
  ['Mazda RX-7', 'FD', 'B', 'Heck', 284, 'Leicht und wendig — ein Liebling der Drift-Szene.'],
  ['Ford Focus RS', '', 'C', 'Allrad', 264, 'Bezahlbarer Allrounder für den Aufstieg.'],
  ['Volkswagen Golf GTI', 'Mk5', 'D', 'Front', 241, 'Solider Start-Hot-Hatch für neue Fahrer.'],
  ['Dodge Challenger SRT8', '', 'B', 'Heck', 289, 'Geradeaus-Gewalt mit viel Charakter.'],
];
const CLASS_COLOR = { S: 'var(--ignition)', A: 'var(--xenon)', B: '#9b8cff', C: '#2bd576', D: 'var(--muted)' };

const NEWS = [
  ['12.06.2026', 'Saison', 'Saison 3: „Stadtkern bei Nacht"', 'Neue Sprint- und Verfolgungsrouten durch das Bankenviertel, dazu frische Saison-Belohnungen bis Level 60. Die Reputation aus Saison 2 bleibt erhalten.'],
  ['28.05.2026', 'Update', 'Anti-Cheat 2.4 ist live', 'Serverseitige Geschwindigkeits- und Telemetrie-Prüfung verschärft. Faire Zeiten zählen, manipulierte Läufe fliegen automatisch aus der Wertung.'],
  ['14.05.2026', 'Fuhrpark', 'Drei neue Klasse-S-Fahrzeuge', 'Der Fuhrpark wächst: Top-Klasse-Autos mit überarbeiteten Fahrwerten sind ab sofort im Spiel verfügbar.'],
  ['01.05.2026', 'Event', 'Doppelte Reputation am Wochenende', 'Jeden ersten Samstag und Sonntag im Monat gibt es doppelte Rep auf alle gewonnenen Rennen. Zeit, in der Bestenliste zu klettern.'],
];

const FAQ = [
  ['Ist das Spiel kostenlos?', 'Ja. Konto erstellen, Launcher laden, fahren — komplett kostenlos. NITROBAHN ist ein nicht-kommerzielles Community-Projekt.'],
  ['Brauche ich das Originalspiel?', 'Du brauchst die Spieldateien von Need for Speed: World. Der Community-Launcher lädt den passenden Client herunter und verbindet ihn mit diesem Server. Wir selbst verteilen keine Spieldateien.'],
  ['Wie verbinde ich mich mit dem Server?', 'Konto hier registrieren, dann den Community-Launcher (GameLauncher) installieren, in der Serverliste NITROBAHN auswählen und mit deinen Zugangsdaten anmelden.'],
  ['Läuft das auf meinem PC?', 'Need for Speed: World läuft ab Windows 7 und ist sehr genügsam — auch ältere und schwächere Rechner kommen damit gut zurecht.'],
  ['Kann ich mit Freunden in einer Crew fahren?', 'Ja. Crews sind Teil des Spiels. Euer Crew-Name erscheint auch hier auf der Bestenliste neben eurem Fahrernamen.'],
  ['Sind meine Zugangsdaten sicher?', 'Passwörter werden nur als gesalzener Hash gespeichert, niemals im Klartext. Deine Sitzung läuft über ein signiertes, nur serverseitig lesbares Cookie.'],
];

const SHOP = [
  ['Starter-Paket', '50.000', 'Cash + ein solides Klasse-C-Auto für den schnellen Einstieg.', false],
  ['Reputation-Boost', '7 Tage', '+50 % Reputation auf jedes gewonnene Rennen, eine Woche lang.', true],
  ['Vinyl-Paket „Mitternacht"', '12.000', 'Exklusive Aufkleber- und Lackdesigns für deine Garage.', false],
  ['Zusätzlicher Garagen-Slot', '25.000', 'Mehr Platz für deine Sammlung. Stell mehr Autos gleichzeitig bereit.', false],
];

// ── Bausteine ────────────────────────────────────────────────────────────────
function pageHead(kicker, title, sub) {
  return `<div class="section-head"><div>
    <div class="kicker">${esc(kicker)}</div>
    <h2>${esc(title)}</h2>
    ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
  </div></div>`;
}

function boardRows(rows, sort) {
  const myName = state.me && state.me.persona ? state.me.persona.name : null;
  const metric = (r) => {
    if (sort === 'top_speed') return `<span class="metric hot">${fmt(r.topSpeedKmh)}<span class="subtle"> km/h</span></span>`;
    if (sort === 'wins') return `<span class="metric">${fmt(r.racesWon)}</span>`;
    if (sort === 'distance') return `<span class="metric">${fmt(r.distanceKm)}<span class="subtle"> km</span></span>`;
    return `<span class="metric">${fmt(r.reputation)}</span>`;
  };
  return rows.map((r) => {
    const top = r.rank <= 3 ? ` top${r.rank}` : '';
    const me = myName && r.name === myName ? ' me' : '';
    return `<tr class="${top}${me}">
      <td class="rankcell">${r.rank}</td>
      <td><div class="driver-cell">
        <div class="av">${initials(r.name)}</div>
        <div><div class="nm">${esc(r.name)} <span style="font-size:13px">${flag(r.country)}</span></div>
        <div class="cr">${esc(r.crew || '—')}</div></div>
      </div></td>
      <td class="num hide-sm"><span class="lvl">${r.level}</span></td>
      <td class="num">${metric(r)}</td>
      <td class="num hide-sm"><span class="subtle">${r.winRate}%</span></td>
    </tr>`;
  }).join('');
}

const METRIC_LABEL = { reputation: 'Reputation', top_speed: 'Top-Speed', wins: 'Siege', distance: 'Distanz' };

function boardShell(showTabs, showSearch) {
  return `
    <div class="lb-bar">
      ${showTabs ? `<div class="lb-tabs" role="tablist" id="lbTabs">
        ${Object.entries(METRIC_LABEL).map(([k, v]) =>
          `<button class="lb-tab" role="tab" data-sort="${k}" aria-selected="${state.sort === k}">${v}</button>`).join('')}
      </div>` : ''}
      ${showSearch ? `<input class="lb-search" id="lbSearch" type="search" placeholder="Fahrer suchen…" value="${esc(state.search)}" />` : ''}
    </div>
    <div class="panel board"><table class="lb">
      <thead><tr>
        <th style="width:60px">#</th><th>Fahrer</th>
        <th class="num hide-sm">Level</th>
        <th class="num" id="metricHead">${METRIC_LABEL[state.sort]}</th>
        <th class="num hide-sm">Siegquote</th>
      </tr></thead>
      <tbody id="lbBody"><tr><td colspan="5" style="padding:30px;text-align:center;color:var(--muted)">Lade Wertung…</td></tr></tbody>
    </table></div>`;
}

// ── Views ────────────────────────────────────────────────────────────────────
function viewHome() {
  return `
  <header class="hero" id="top"><div class="wrap hero-grid">
    <div>
      <span class="eyebrow">Mitternachts-Server · Jetzt live</span>
      <h1>Die Stadt hört<br>nie auf zu <span class="hot">fahren.</span></h1>
      <p class="lede">Ein Community-Revival von <em>Need for Speed: World</em>. Bau deinen Fahrer auf, klettere die Rep-Leiter hoch und beherrsche die Bestenliste. Kein Tempolimit, keine Sperrstunde.</p>
      <div class="hero-cta">
        <button class="btn primary" id="ctaRegister">Fahrer erstellen</button>
        <a class="btn ghost" href="#/faq">So fährst du mit</a>
      </div>
    </div>
    <div id="heroSide">
      <div class="panel hud" id="hudCard">
        <div class="live"><span class="dot"></span> Serverstatus · Live</div>
        <div class="online-num mono" id="onlineNum">—</div>
        <div class="online-label">Fahrer gerade online</div>
        <div class="hud-stats">
          <div><div class="k">Registriert</div><div class="v" id="stDrivers">—</div></div>
          <div><div class="k">Rennen</div><div class="v" id="stRaces">—</div></div>
          <div><div class="k">Distanz (km)</div><div class="v" id="stDist">—</div></div>
          <div><div class="k">Top-Speed</div><div class="v" id="stSpeed">—</div></div>
        </div>
      </div>
    </div>
  </div></header>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div><div class="kicker">Wertung</div><h2>Top 10 der Bestenliste</h2>
        <p class="sub">Jedes Rennen zählt. Die Rangliste aktualisiert sich live — finde deinen Namen und hol dir einen besseren Platz.</p></div>
        <a class="btn ghost sm" href="#/bestenliste">Komplette Liste</a>
      </div>
      <div class="panel board"><table class="lb">
        <thead><tr><th style="width:60px">#</th><th>Fahrer</th><th class="num hide-sm">Level</th><th class="num">Reputation</th><th class="num hide-sm">Siegquote</th></tr></thead>
        <tbody id="lbBody"><tr><td colspan="5" style="padding:30px;text-align:center;color:var(--muted)">Lade Wertung…</td></tr></tbody>
      </table></div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${pageHead('Warum hier fahren', 'Ein Server, der bleibt', '')}
      <div class="feats">
        <div class="panel feat"><div class="ic">⚙</div><h3>Voller SBRW-Core</h3><p>Läuft auf der modernen Soapbox-Race-World-Engine — jedes Auto, jeder Modus und jedes Event aus dem Originalspiel, wiederhergestellt und gepflegt.</p></div>
        <div class="panel feat"><div class="ic">📈</div><h3>Live-Bestenliste</h3><p>Reputation, Top-Speed, Siege und Distanz — pro Fahrer erfasst und in Echtzeit sortiert. Deine harten Runden zählen wirklich.</p></div>
        <div class="panel feat"><div class="ic">🛡</div><h3>Faires Spiel</h3><p>Aktives Anti-Cheat und ein Moderationsteam halten das Feld sauber. Der Name ganz oben hat sich seinen Platz verdient.</p></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${pageHead('Auf die Strecke', 'In drei Schritten ins Rennen', '')}
      <div class="steps">
        <div class="panel step"><div class="no">SCHRITT 01</div><h3>Fahrer erstellen</h3><p>Kostenloses Konto anlegen und Fahrernamen sichern. Dieser Name klettert die Bestenliste hoch.</p></div>
        <div class="panel step"><div class="no">SCHRITT 02</div><h3>Launcher installieren</h3><p>Community-Launcher laden, auf diesen Server zeigen lassen und den aktuellen Client samt Mods holen.</p></div>
        <div class="panel step"><div class="no">SCHRITT 03</div><h3>Vollgas geben</h3><p>Anmelden, Auto wählen und in Verfolgungs-, Rundkurs- und Sprint-Events Reputation sammeln.</p></div>
      </div>
    </div>
  </section>`;
}

function viewLeaderboard() {
  return `<section class="section"><div class="wrap">
    ${pageHead('Wertung', 'Bestenliste', 'Alle Fahrer, vier Wertungen. Such deinen Namen und vergleich dich mit dem Feld.')}
    ${boardShell(true, true)}
  </div></section>`;
}

function viewGarage() {
  const cards = CARS.map((c) => {
    const [name, variant, cls, drive, speed, note] = c;
    return `<div class="panel car">
      <div class="car-top">
        <span class="cls" style="--cc:${CLASS_COLOR[cls]}">${cls}</span>
        <span class="car-speed mono">${speed}<small> km/h</small></span>
      </div>
      <div class="car-mono">${initials(name)}</div>
      <h3>${esc(name)} ${variant ? `<span class="variant">${esc(variant)}</span>` : ''}</h3>
      <p class="car-note">${esc(note)}</p>
      <div class="car-meta"><span>${drive}</span><span>Klasse ${cls}</span></div>
    </div>`;
  }).join('');
  return `<section class="section"><div class="wrap">
    ${pageHead('Fuhrpark', 'Wähl deine Waffe', 'Von der Tuner-Ikone bis zum Klasse-S-Monster — eine Auswahl der Fahrzeuge, die hier auf der Strecke sind.')}
    <div class="cars">${cards}</div>
    <p class="note-line">Vollständiger Fahrzeug-Katalog kommt aus dem SBRW-Core (catalog/basket). Diese Auswahl ist ein Auszug.</p>
  </div></section>`;
}

function viewShop() {
  const items = SHOP.map((s) => {
    const [name, price, desc, boost] = s;
    return `<div class="panel shop-item${boost ? ' boost' : ''}">
      ${boost ? '<span class="tag-boost">Boost</span>' : ''}
      <h3>${esc(name)}</h3>
      <p>${esc(desc)}</p>
      <div class="shop-foot"><span class="price mono">${esc(price)}</span><button class="btn primary sm" data-shop>${boost ? 'Aktivieren' : 'Kaufen'}</button></div>
    </div>`;
  }).join('');
  return `<section class="section"><div class="wrap">
    ${pageHead('Shop', 'Garage & Boosts', 'Alles mit Spielwährung — kein Pay-to-Win, nur Komfort und Kosmetik.')}
    <div class="shop">${items}</div>
    <p class="note-line">Beispiel-Shop. Im Live-Betrieb wird er an den Store des SBRW-Servers gekoppelt und bucht echte In-Game-Währung.</p>
  </div></section>`;
}

function viewNews() {
  const items = NEWS.map((n) => {
    const [date, tag, title, body] = n;
    return `<article class="panel news-item">
      <div class="news-meta"><span class="news-tag">${esc(tag)}</span><time class="mono">${esc(date)}</time></div>
      <h3>${esc(title)}</h3><p>${esc(body)}</p>
    </article>`;
  }).join('');
  return `<section class="section"><div class="wrap">
    ${pageHead('News', 'Aktuelles vom Server', 'Updates, Events und Änderungen — was sich auf NITROBAHN gerade tut.')}
    <div class="news">${items}</div>
  </div></section>`;
}

function viewFaq() {
  const items = FAQ.map((f, i) => `
    <div class="panel faq-item" data-faq="${i}">
      <button class="faq-q"><span>${esc(f[0])}</span><span class="faq-ic">+</span></button>
      <div class="faq-a"><p>${esc(f[1])}</p></div>
    </div>`).join('');
  return `<section class="section"><div class="wrap">
    ${pageHead('Hilfe', 'Häufige Fragen', 'Kurz erklärt, wie du loslegst und worauf du achten solltest.')}
    <div class="faq">${items}</div>
  </div></section>`;
}

// ── Dynamische Lader ─────────────────────────────────────────────────────────
async function loadStatus() {
  if (!$('#onlineNum')) return;
  let s;
  try { s = await api('/api/status'); } catch { s = demoStatus(); }
  $('#onlineNum').textContent = fmt(s.online);
  $('#stDrivers').textContent = fmt(s.drivers);
  $('#stRaces').textContent = fmt(s.racesTotal);
  $('#stDist').textContent = fmt(s.distanceKm);
  $('#stSpeed').textContent = s.topSpeedKmh + ' km/h';
}

async function loadBoard(limit) {
  const body = $('#lbBody');
  if (!body) return;
  if ($('#metricHead')) $('#metricHead').textContent = METRIC_LABEL[state.sort];
  let rows;
  try { rows = (await api(`/api/leaderboard?sort=${state.sort}&limit=${limit || 25}`)).rows; }
  catch { rows = demoSort(DEMO, state.sort); }
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || (r.crew || '').toLowerCase().includes(q));
  }
  body.innerHTML = rows.length ? boardRows(rows, state.sort)
    : `<tr><td colspan="5" style="padding:30px;text-align:center;color:var(--muted)">Kein Fahrer gefunden.</td></tr>`;
}

function renderHeroDriver() {
  const side = $('#heroSide');
  if (!side || !(state.me && state.me.persona)) return;
  const p = state.me.persona;
  const repToNext = 5000;
  const prog = Math.min(100, Math.round(((p.reputation % repToNext) / repToNext) * 100));
  side.innerHTML = `<div class="panel driver-card">
    <div class="dc-head">
      <span class="flag">${flag(p.country)}</span>
      <div><div class="dc-name">${esc(p.name)}</div><div class="dc-crew">${esc(p.crew || 'Keine Crew')}</div></div>
      <div class="rankpill"><div class="rk">#${state.me.rank ?? '—'}</div>
      <div style="font-size:11px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase">Globaler Rang</div></div>
    </div>
    <div class="dc-grid">
      <div><div class="k">Level</div><div class="v">${p.level}</div></div>
      <div><div class="k">Reputation</div><div class="v" style="color:var(--ignition)">${fmt(p.reputation)}</div></div>
      <div><div class="k">Cash</div><div class="v">$${fmt(p.cash)}</div></div>
      <div><div class="k">Siege</div><div class="v">${fmt(p.racesWon)}</div></div>
      <div><div class="k">Siegquote</div><div class="v">${p.winRate}%</div></div>
      <div><div class="k">Top-Speed</div><div class="v" style="color:var(--xenon)">${p.topSpeedKmh}</div></div>
    </div>
    <div class="replevel"><div class="row"><span>Level ${p.level}</span><span>${prog}% bis zum nächsten</span></div>
    <div class="bar"><i style="width:${prog}%"></i></div></div>
  </div>`;
}

// ── Router ───────────────────────────────────────────────────────────────────
const ROUTES = {
  '/': viewHome, '/bestenliste': viewLeaderboard, '/fuhrpark': viewGarage,
  '/shop': viewShop, '/news': viewNews, '/faq': viewFaq,
};

function render() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const view = ROUTES[path] || viewHome;
  $('#app').innerHTML = view();
  window.scrollTo(0, 0);
  $$('#navLinks a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + path));
  wireView(path);
}

function wireView(path) {
  if (path === '/') {
    $('#ctaRegister') && ($('#ctaRegister').onclick = () => openModal('register'));
    renderHeroDriver();
    loadStatus();
    loadBoard(10);
  }
  if (path === '/bestenliste') {
    $$('#lbTabs .lb-tab').forEach((t) => t.onclick = () => {
      state.sort = t.dataset.sort;
      $$('#lbTabs .lb-tab').forEach((x) => x.setAttribute('aria-selected', x === t));
      $('#metricHead').textContent = METRIC_LABEL[state.sort];
      loadBoard(50);
    });
    const sb = $('#lbSearch');
    if (sb) sb.oninput = () => { state.search = sb.value; loadBoard(50); };
    loadBoard(50);
  }
  if (path === '/faq') {
    $$('.faq-item').forEach((it) => {
      it.querySelector('.faq-q').onclick = () => it.classList.toggle('open');
    });
  }
  $$('[data-shop]').forEach((b) => b.onclick = () => alert('Beispiel-Shop — im Live-Betrieb an den SBRW-Store gekoppelt.'));
  $$('[data-link]').forEach((a) => a.onclick = (e) => e.preventDefault());
}

// ── Auth ─────────────────────────────────────────────────────────────────────
async function loadMe() {
  try { const d = await api('/api/me'); state.me = d.user ? { user: d.user, persona: d.persona, rank: d.rank } : null; }
  catch { state.me = null; }
  renderNav();
}
function renderNav() {
  const el = $('#navRight');
  if (state.me && state.me.persona) {
    const p = state.me.persona;
    el.innerHTML = `<div class="chip"><div class="av">${initials(p.name)}</div><span class="nm">${esc(p.name)}</span></div>
      <button class="btn ghost sm" id="logoutBtn">Abmelden</button>`;
    $('#logoutBtn').onclick = doLogout;
  } else {
    el.innerHTML = `<button class="btn ghost sm" id="navLogin">Anmelden</button>
      <button class="btn primary sm" id="navRegister">Registrieren</button>`;
    $('#navLogin').onclick = () => openModal('login');
    $('#navRegister').onclick = () => openModal('register');
  }
}

function openModal(tab) { $('#authModal').classList.add('open'); switchTab(tab || 'login'); }
function closeModal() { $('#authModal').classList.remove('open'); $('#loginMsg').textContent = ''; $('#registerMsg').textContent = ''; }
function switchTab(tab) {
  const login = tab === 'login';
  $('#tabLogin').classList.toggle('active', login);
  $('#tabRegister').classList.toggle('active', !login);
  $('#loginForm').style.display = login ? '' : 'none';
  $('#registerForm').style.display = login ? 'none' : '';
}
function setMsg(el, text, ok) { el.textContent = text; el.className = 'form-msg ' + (ok ? 'ok' : 'err'); }

async function doLogin(e) {
  e.preventDefault(); const f = e.target; setMsg($('#loginMsg'), '', true);
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ email: f.email.value, password: f.password.value }) });
    closeModal(); await loadMe();
    if ((location.hash.replace(/^#/, '') || '/') === '/') { renderHeroDriver(); loadBoard(10); }
    else location.hash = '#/';
  } catch (err) {
    setMsg($('#loginMsg'), err.message === 'Failed to fetch' ? 'Backend läuft nicht — das ist die statische Vorschau.' : err.message, false);
  }
}
async function doRegister(e) {
  e.preventDefault(); const f = e.target; setMsg($('#registerMsg'), '', true);
  try {
    await api('/api/register', { method: 'POST', body: JSON.stringify({
      email: f.email.value, password: f.password.value, driverName: f.driverName.value, country: f.country.value }) });
    setMsg($('#registerMsg'), 'Fahrer erstellt — willkommen auf der Strecke!', true);
    await loadMe();
    setTimeout(() => { closeModal(); location.hash = '#/'; render(); }, 700);
  } catch (err) {
    setMsg($('#registerMsg'), err.message === 'Failed to fetch' ? 'Backend läuft nicht — das ist die statische Vorschau.' : err.message, false);
  }
}
async function doLogout() { try { await api('/api/logout', { method: 'POST' }); } catch {} location.reload(); }

// ── Init ─────────────────────────────────────────────────────────────────────
function init() {
  $('#authClose').onclick = closeModal;
  $('#authModal').onclick = (e) => { if (e.target.id === 'authModal') closeModal(); };
  $('#tabLogin').onclick = () => switchTab('login');
  $('#tabRegister').onclick = () => switchTab('register');
  $('#loginForm').onsubmit = doLogin;
  $('#registerForm').onsubmit = doRegister;
  $('#footLogin').onclick = (e) => { e.preventDefault(); openModal('login'); };
  $('#footRegister').onclick = (e) => { e.preventDefault(); openModal('register'); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  window.addEventListener('hashchange', render);

  loadMe();
  render();
  setInterval(loadStatus, 15000);
}
document.addEventListener('DOMContentLoaded', init);
