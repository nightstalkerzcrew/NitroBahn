// ── Seed ─────────────────────────────────────────────────────────────────────
// Populates the database with demo drivers + a ready-to-use test account so the
// leaderboard looks alive on first run. Safe to run repeatedly: it only seeds
// when the personas table is empty.
require('./env').loadEnv();
const { db } = require('./db');
const { Store } = require('./store');
const { hashPassword } = require('./auth');

const DRIVERS = [
  ['Vyper', 'DE', 'NOS Kartell'], ['Nakamura', 'JP', 'Kanjo Crew'], ['SaintNova', 'FR', 'Minuit'],
  ['BoostedBjorn', 'SE', 'Nordlys'], ['QuattroQueen', 'AT', 'Alpenglut'], ['ApexAdé', 'BR', 'Favela GT'],
  ['Mileena', 'PL', 'Nocny Zjazd'], ['GripGandalf', 'NZ', 'Southern Drift'], ['Volkan', 'TR', 'Bogaz'],
  ['RedlineRiya', 'IN', 'Mumbai Maniax'], ['Sokol', 'CZ', 'Praha Predators'], ['NitroNoor', 'NL', 'Polder Pace'],
  ['Cinder', 'US', 'Midnight Society'], ['Tarmacchiato', 'IT', 'Notte Veloce'], ['ZephyrZoe', 'CA', 'Frostbite'],
  ['Halcyon', 'GB', 'Albion Apex'], ['Mateo', 'ES', 'Madrugada'], ['IcyIvar', 'NO', 'Fjord Fury'],
  ['DriftDmitri', 'RU', 'Sibir Slide'], ['LumenLukas', 'DE', 'NOS Kartell'], ['Suvi', 'FI', 'Aurora'],
  ['CobraCaio', 'PT', 'Lisboa Lunatics'], ['Yara', 'EG', 'Cairo Cobras'], ['SilkSeo', 'KR', 'Seoul Surge'],
  ['BlitzBruno', 'CH', 'Alpenglut'], ['Mirage', 'AE', 'Dune Runners'], ['Penny', 'AU', 'Outback OD'],
  ['VortexVera', 'UA', 'Kyiv Kinetics'], ['Halvard', 'DK', 'Nordlys'], ['EchoElif', 'TR', 'Bogaz'],
  ['GhostGael', 'IE', 'Emerald Pace'], ['NeonNiko', 'GR', 'Aegean'], ['TorqueTomas', 'MX', 'Lucha Velocidad'],
  ['Sable', 'US', 'Midnight Society'], ['Kasimir', 'PL', 'Nocny Zjazd'], ['VeloVic', 'CO', 'Cartel Curve'],
  ['Frost', 'CA', 'Frostbite'], ['Anaya', 'IN', 'Mumbai Maniax'], ['SlipstreamSam', 'GB', 'Albion Apex'],
  ['Rion', 'JP', 'Kanjo Crew'], ['HazeHaru', 'JP', 'Tokyo Tollway'], ['Marlowe', 'GB', 'Albion Apex'],
  ['Bastian', 'DE', 'Autobahn Echo'], ['Liva', 'LV', 'Baltic Burn'], ['Onyx', 'US', 'Coastal Crew'],
  ['Pirelli Pia', 'IT', 'Notte Veloce'], ['Caltex', 'AU', 'Outback OD'], ['Wraith', 'GB', 'Phantom Line'],
  ['Soledad', 'AR', 'Pampa Push'], ['Kemal', 'TR', 'Bogaz'], ['Nyx', 'GR', 'Aegean'],
  ['Doppler', 'DE', 'Autobahn Echo'], ['Riptide', 'US', 'Coastal Crew'], ['Aiko', 'JP', 'Tokyo Tollway'],
  ['Volna', 'RU', 'Sibir Slide'], ['Faro', 'PT', 'Lisboa Lunatics'], ['Pulse', 'CA', 'Frostbite'],
  ['Marisol', 'MX', 'Lucha Velocidad'], ['Stigr', 'IS', 'Fjord Fury'], ['Kobe', 'BE', 'Polder Pace'],
];

function rngFactory(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function seed() {
  if (Store.countPersonas() > 0) {
    console.log('Database already seeded — skipping.');
    return;
  }
  const rnd = rngFactory(20140710); // NFSW launch-ish seed for stable data

  const insertUser = db.prepare('INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)');
  const insertPersona = db.prepare(`
    INSERT INTO personas
      (user_id, name, level, reputation, cash, races_total, races_won,
       distance_km, top_speed_kmh, crew, country, last_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const placeholderHash = '$2a$11$0000000000000000000000000000000000000000000000000000'; // unusable; bots can't log in

  const tx = db.transaction(() => {
    DRIVERS.forEach((d, i) => {
      const [name, country, crew] = d;
      // Distribute stats so the board has a believable curve.
      const tier = rnd();
      const level = Math.min(60, Math.max(1, Math.round(60 * Math.pow(tier, 0.8))));
      const reputation = Math.round(level * (1800 + rnd() * 1400) + rnd() * 5000);
      const racesTotal = Math.round(level * (6 + rnd() * 9));
      const racesWon = Math.round(racesTotal * (0.35 + rnd() * 0.45));
      const distance = Math.round(racesTotal * (12 + rnd() * 20));
      const topSpeed = Math.round(250 + tier * 120 + rnd() * 25);
      const cash = Math.round(20000 + reputation * (0.4 + rnd()));
      const lastActive = `-${Math.round(rnd() * 280)} minutes`;

      const uid = insertUser.run(`bot_${i}@drivers.local`, placeholderHash, 0).lastInsertRowid;
      insertPersona.run(uid, name, level, reputation, cash, racesTotal, racesWon, distance, topSpeed, crew, country, lastActive);
    });
  });
  tx();

  console.log(`Seeded ${DRIVERS.length} demo drivers.`);
}

async function seedTestAccount() {
  const email = 'demo@nfsw.local';
  if (Store.getUserByEmail(email)) return;
  const hash = await hashPassword('speed123');
  const uid = Store.createUser({ email, passwordHash: hash });
  Store.createPersona({ userId: uid, name: 'DemoDriver', country: 'DE' });
  // Give the demo account some respectable stats.
  db.prepare(`UPDATE personas SET level=42, reputation=98750, cash=412000,
              races_total=512, races_won=331, distance_km=8420, top_speed_kmh=341,
              crew='NOS Kartell' WHERE name='DemoDriver'`).run();
  console.log('Test account ready  ->  email: demo@nfsw.local   password: speed123');
}

(async () => {
  seed();
  await seedTestAccount();
})();
