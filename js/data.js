// Holdout: game data. Survivors, weapons, the dead, base facilities and the region around the base.

const GAME_VERSION = '8';

// --- Resources ---
const RESOURCES = {
  food: { name: 'Food', icon: '🥫' },
  materials: { name: 'Materials', icon: '🔩' },
  medicine: { name: 'Medicine', icon: '💊' },
  ammo: { name: 'Ammo', icon: '🔫' },
  fuel: { name: 'Fuel', icon: '⛽' },
};

// --- Survivors ---
const FIRST_NAMES = ['Ada', 'Ben', 'Cora', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ira', 'Jo', 'Kai', 'Lena', 'Max', 'Nell', 'Omar', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tess', 'Uri', 'Vic', 'Wes', 'Yara', 'Zed', 'Marta', 'Joel', 'Lily', 'Nate', 'Ruth'];
const LAST_NAMES = ['Abbott', 'Brandt', 'Cole', 'Diaz', 'Ekberg', 'Frost', 'Grady', 'Holm', 'Ives', 'Jansen', 'Kowalski', 'Lund', 'Mercer', 'Novak', 'Ortiz', 'Price', 'Reyes', 'Shaw', 'Tran', 'Voss', 'Walsh', 'Young'];
// Each survivor has a specialty: what they do best in the field and at home.
const SPECIALTIES = {
  fighter: { name: 'Fighter', icon: '🪓', desc: '+2 hitpoints and +2 melee damage.', hp: 2, meleeDmg: 2 },
  shooter: { name: 'Sharpshooter', icon: '🎯', desc: '+10 aim with firearms.', aim: 10 },
  scout: { name: 'Scout', icon: '👟', desc: '+2 movement, and quiet: zombies notice them later.', move: 2, stealth: true },
  medic: { name: 'Medic', icon: '🩺', desc: 'Heals for twice as much in the field. At home, injured survivors recover a day faster.', healBonus: true },
  engineer: { name: 'Engineer', icon: '🔧', desc: 'Searches crates for more materials. At home, speeds up building by a day\'s work each day.', builder: true },
};
// Levels and the skill tree are in skills.js.

// --- Weapons ---
// Firearms: dmg [min, max], clip, aim bonus, best range (tiles) and noise per shot. Melee: dmg, aim, and no noise.
const WEAPONS = {
  pistol: { name: 'Pistol', icon: '🔫', type: 'gun', dmg: [3, 4], clip: 8, aim: 0, range: 7, noise: 2 },
  revolver: { name: 'Revolver', icon: '🔫', type: 'gun', dmg: [4, 6], clip: 6, aim: 0, range: 7, noise: 3 },
  shotgun: { name: 'Shotgun', icon: '💥', type: 'gun', dmg: [5, 8], clip: 4, aim: 10, range: 3, noise: 4 },
  rifle: { name: 'Hunting Rifle', icon: '🎯', type: 'gun', dmg: [5, 7], clip: 5, aim: 10, range: 10, noise: 3 },
  smg: { name: 'Submachine Gun', icon: '🔫', type: 'gun', dmg: [3, 5], clip: 20, aim: 0, range: 6, noise: 3, burst: 2 },
  suppressed: { name: 'Suppressed Pistol', icon: '🤫', type: 'gun', dmg: [3, 4], clip: 10, aim: 5, range: 7, noise: 0 },
  assault: { name: 'Assault Rifle', icon: '🪖', type: 'gun', dmg: [5, 7], clip: 25, aim: 5, range: 9, noise: 4, burst: 2 },
  knife: { name: 'Kitchen Knife', icon: '🔪', type: 'melee', dmg: [2, 3], aim: 10 },
  bat: { name: 'Baseball Bat', icon: '🏏', type: 'melee', dmg: [3, 4], aim: 5 },
  machete: { name: 'Machete', icon: '🗡️', type: 'melee', dmg: [4, 5], aim: 5 },
  axe: { name: 'Fire Axe', icon: '🪓', type: 'melee', dmg: [5, 7], aim: 0 },
  sledge: { name: 'Sledgehammer', icon: '🔨', type: 'melee', dmg: [6, 9], aim: -10 },
};
const FISTS = { name: 'Fists', icon: '✊', type: 'melee', dmg: [1, 2], aim: 0 };

// Things you carry into a mission and use up.
const GEAR = {
  medkit: { name: 'Medkit', icon: '🩹', desc: 'Heals 4 (8 for a medic). Made from 1 medicine.', heal: 4 },
  pipe_bomb: { name: 'Pipe Bomb', icon: '💣', desc: '5 damage to everything within 1 tile of where it lands. Very loud.', dmg: 5, radius: 1, noise: 8 },
  flare: { name: 'Flare', icon: '🎆', desc: 'Every zombie that can see it walks to it this turn instead of to you.', lure: 3 },
};

// --- The dead, and the living who want what you have ---
// sight: tiles they notice you from. infect: chance a hit gives the Blood Plague.
const ENEMIES = {
  walker: { name: 'Walker', icon: '🧟', hp: 4, move: 3, dmg: [2, 3], aim: 60, sight: 5, infect: 0.05, xp: 1 },
  runner: { name: 'Runner', icon: '🏃', hp: 4, move: 6, dmg: [2, 3], aim: 70, sight: 6, infect: 0.05, xp: 2 },
  bloater: { name: 'Bloater', icon: '🤢', hp: 7, move: 2, dmg: [2, 3], aim: 60, sight: 4, infect: 0.1, burst: 3, xp: 2, desc: 'Bursts when it dies, poisoning everyone next to it.' },
  feral: { name: 'Feral', icon: '🐺', hp: 9, move: 7, dmg: [3, 5], aim: 75, sight: 7, infect: 0.2, attacks: 2, xp: 4, desc: 'Fast and vicious. Strikes twice.' },
  juggernaut: { name: 'Juggernaut', icon: '🦍', hp: 22, move: 3, dmg: [5, 8], aim: 70, sight: 5, infect: 0.1, xp: 8, desc: 'A wall of rotting muscle. Bullets barely slow it.' },
  heart: { name: 'Plague Heart', icon: '🫀', hp: 24, move: 0, dmg: [0, 0], aim: 0, sight: 0, infect: 0, xp: 10, heart: true, desc: 'A pulsing mass that calls the dead. Destroy it.' },
  raider: { name: 'Raider', icon: '🥷', hp: 8, move: 5, dmg: [3, 5], aim: 55, sight: 8, range: 7, xp: 4, human: true, desc: 'Armed, and takes cover.' },
  raider_boss: { name: 'Raider Boss', icon: '🦹', hp: 14, move: 5, dmg: [4, 6], aim: 65, sight: 8, range: 8, xp: 8, human: true },
};

// --- Base facilities: build once, then upgrade ---
// Each level: cost, days to build, and what it does (read by the game rules).
const FACILITIES = {
  bunks: {
    name: 'Bunks', icon: '🛏️', desc: 'Beds for your people. More survivors than beds hurts morale.',
    levels: [{ cost: {}, days: 0, beds: 4 }, { cost: { materials: 8 }, days: 1, beds: 6 }, { cost: { materials: 15 }, days: 2, beds: 9 }],
  },
  garden: {
    name: 'Garden', icon: '🌱', desc: 'Grows food every day.',
    levels: [{ cost: { materials: 6 }, days: 1, food: 2 }, { cost: { materials: 12 }, days: 2, food: 4 }, { cost: { materials: 20, fuel: 2 }, days: 3, food: 7 }],
  },
  infirmary: {
    name: 'Infirmary', icon: '🏥', desc: 'Injured survivors heal faster here, and the Blood Plague can be cured with medicine.',
    levels: [{ cost: { materials: 8 }, days: 1, heal: 1 }, { cost: { materials: 15, medicine: 2 }, days: 2, heal: 2 }],
  },
  workshop: {
    name: 'Workshop', icon: '🛠️', desc: 'Make ammo, medkits and bombs from what you scavenge.',
    levels: [{ cost: { materials: 10 }, days: 1, craft: 1 }, { cost: { materials: 18, fuel: 2 }, days: 2, craft: 2 }],
  },
  watchtower: {
    name: 'Watchtower', icon: '🗼', desc: 'See further across the region, and warns you when a horde is near. In a siege, a lookout shoots from it.',
    levels: [{ cost: { materials: 8 }, days: 1, reveal: 120, sniper: 1 }, { cost: { materials: 16 }, days: 2, reveal: 240, sniper: 2 }],
  },
  walls: {
    name: 'Walls', icon: '🧱', desc: 'Barricades that hold the dead back when they come for the base. Higher walls draw fewer of them.',
    levels: [{ cost: { materials: 10 }, days: 1, barricade: 10, threat: 1 }, { cost: { materials: 20 }, days: 2, barricade: 20, threat: 2 }, { cost: { materials: 30, fuel: 3 }, days: 3, barricade: 32, threat: 3 }],
  },
  radio: {
    name: 'Radio Tower', icon: '📻', desc: 'Picks up other survivors. Now and then someone calls for help, and might join you.',
    levels: [{ cost: { materials: 12, fuel: 2 }, days: 2, contact: 0.25 }, { cost: { materials: 20, fuel: 4 }, days: 2, contact: 0.45 }],
  },
};
const FACILITY_SLOTS = 6;

// What the workshop can make: cost, workshop level, result.
const CRAFTS = {
  ammo: { name: '6 Ammo', icon: '🔫', cost: { materials: 3 }, level: 1, gives: { ammo: 6 } },
  medkit: { name: 'Medkit', icon: '🩹', cost: { medicine: 1 }, level: 1, gear: 'medkit' },
  pipe_bomb: { name: 'Pipe Bomb', icon: '💣', cost: { materials: 3, fuel: 1 }, level: 1, gear: 'pipe_bomb' },
  flare: { name: 'Flare', icon: '🎆', cost: { materials: 1, fuel: 1 }, level: 2, gear: 'flare' },
  suppressed: { name: 'Suppressed Pistol', icon: '🤫', cost: { materials: 12 }, level: 2, weapon: 'suppressed' },
  machete: { name: 'Machete', icon: '🗡️', cost: { materials: 6 }, level: 2, weapon: 'machete' },
};

// --- The region ---
// Site types: what they hold, how dangerous they are, and what lives there.
const SITE_TYPES = {
  houses: { name: 'Houses', icon: '🏘️', loot: { food: [2, 4], materials: [1, 3], medicine: [0, 1] }, danger: 1, crates: 4, weapons: ['knife', 'bat'] },
  diner: { name: 'Diner', icon: '🍔', loot: { food: [3, 6] }, danger: 1, crates: 3, weapons: ['knife'] },
  gas_station: { name: 'Gas Station', icon: '⛽', loot: { fuel: [2, 4], food: [1, 2] }, danger: 1, crates: 3, weapons: ['bat'] },
  farm: { name: 'Farm', icon: '🚜', loot: { food: [3, 6], materials: [1, 2] }, danger: 1, crates: 4, weapons: ['axe', 'shotgun'] },
  hardware: { name: 'Hardware Store', icon: '🔨', loot: { materials: [3, 6] }, danger: 2, crates: 4, weapons: ['axe', 'sledge', 'machete'] },
  pharmacy: { name: 'Pharmacy', icon: '💊', loot: { medicine: [2, 4] }, danger: 2, crates: 3, weapons: [] },
  school: { name: 'School', icon: '🏫', loot: { food: [1, 3], materials: [1, 3], medicine: [0, 2] }, danger: 2, crates: 5, weapons: ['bat'] },
  police: { name: 'Police Station', icon: '🚓', loot: { ammo: [4, 8], medicine: [0, 1] }, danger: 3, crates: 4, weapons: ['revolver', 'shotgun', 'smg'], raiders: true },
  warehouse: { name: 'Warehouse', icon: '🏭', loot: { materials: [3, 6], fuel: [1, 3] }, danger: 3, crates: 5, weapons: ['sledge'], raiders: true },
  hospital: { name: 'Hospital', icon: '🏥', loot: { medicine: [3, 6] }, danger: 4, crates: 5, weapons: ['knife'] },
  checkpoint: { name: 'Army Checkpoint', icon: '🪖', loot: { ammo: [6, 12], fuel: [1, 3] }, danger: 5, crates: 4, weapons: ['assault', 'rifle', 'smg'], raiders: true },
};
// The map of Marrow Creek. x/y on a 1000 × 700 map. stock: how many missions' worth of loot is left.
const BASE_SITE = { name: 'Grace Hill Church', icon: '⛪', x: 500, y: 350 };
const SITES = {
  maple_street: { name: 'Maple Street', type: 'houses', x: 390, y: 290, stock: 3 },
  joes_diner: { name: "Joe's Diner", type: 'diner', x: 610, y: 430, stock: 2 },
  shell_station: { name: 'Route 9 Gas', type: 'gas_station', x: 620, y: 260, stock: 3 },
  pine_houses: { name: 'Pine Court', type: 'houses', x: 560, y: 520, stock: 3 },
  hardware: { name: 'Hendricks Hardware', type: 'hardware', x: 300, y: 400, stock: 3 },
  pharmacy: { name: 'Main Street Pharmacy', type: 'pharmacy', x: 430, y: 470, stock: 2 },
  farm: { name: 'Olsen Farm', type: 'farm', x: 210, y: 230, stock: 4 },
  school: { name: 'Marrow Creek High', type: 'school', x: 720, y: 360, stock: 3 },
  police: { name: 'Police Station', type: 'police', x: 760, y: 200, stock: 3 },
  warehouse: { name: 'Freight Warehouse', type: 'warehouse', x: 820, y: 500, stock: 3 },
  hospital: { name: 'St. Agnes Hospital', type: 'hospital', x: 250, y: 560, stock: 3 },
  checkpoint: { name: 'Army Checkpoint', type: 'checkpoint', x: 880, y: 120, stock: 3 },
  motel: { name: 'Sleepy Pines Motel', type: 'houses', x: 120, y: 420, stock: 3 },
  quarry_houses: { name: 'Quarry Road', type: 'houses', x: 360, y: 130, stock: 3 },
};
// The source of it all: once found, destroying it ends the plague in Marrow Creek.
const HIVE_SITE = 'hospital';
const FUEL_PER_DISTANCE = 250;   // one fuel for every this many map units to a site (rounded up), there and back
const START_REVEAL = 200;        // sites this close to the base are known at the start

// --- Mission and day rules ---
const SQUAD_SIZE = 4;
const DAILY_FOOD = 1;            // per survivor
const THREAT_BASE = 3;           // threat added each day
const THREAT_PER_HEART = 4;      // more for every infested site
const HORDE_AT = 100;
const NOISE_TO_THREAT = 5;       // every this much noise on a mission brings the horde one step closer
const MAX_HEARTS = 3;
const HEART_CHANCE = 0.25;       // chance each day that a new infestation takes root
const INFECTION_DAYS = 3;        // days until the Blood Plague kills, unless cured
const CURE_COST = 2;             // medicine to cure the Blood Plague at the infirmary
const INJURY_DAYS = 3;

const INTRO = [
  'Forty days since the first of them got up again. The phones went first, then the power, then the people.',
  'There are a few of you left, holed up in the old church on Grace Hill above Marrow Creek. The doors are strong and the bell tower sees for miles.',
  'Every day you decide: who goes out, where, and with what. Food runs out. Ammo runs out. Noise brings more of them.',
  'And somewhere in town something is calling the dead together. Find it. Burn it out. Hold out.',
];
