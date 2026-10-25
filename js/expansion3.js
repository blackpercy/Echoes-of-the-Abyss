// Ten more skills: Gardening, Astronomy, Jewelcrafting, Tinkering, Construction, Beast Taming, Slaying,
// Bardic Lore, Medicine and Necromancy. Data only; the rules that use it live in systems2.js.

Object.assign(SKILLS, {
  gardening: { name: 'Gardening', icon: '🌱', type: 'gathering', desc: 'Sow seeds in your plots and come back when they have grown. Gardens grow in real time, even while you are away.' },
  astronomy: { name: 'Astronomy', icon: '🔭', type: 'gathering', desc: 'Watch the night sky and chart what moves in it. Every level teaches you a little more about the things that came from up there.' },
  jewelcrafting: { name: 'Jewelcrafting', icon: '💎', type: 'production', desc: 'Set sea glass, amber, pearls, onyx and star-shards in silver and starmetal: rings and pendants with powers of their own.' },
  tinkering: { name: 'Tinkering', icon: '⚙️', type: 'production', desc: 'Build gadgets of dwarven gears and Mi-Go metal. A gadget helps just by being carried in your pack.' },
  construction: { name: 'Construction', icon: '🏗️', type: 'production', desc: 'Take odd building jobs in town, then build a house of your own and fill it with rooms: a vault, a garden, a workshop, a library, a shrine.' },
  taming: { name: 'Beast Taming', icon: '🐾', type: 'combat', desc: 'Win the trust of the creatures of Aldmark with patience and bait. One pet at a time travels with you and lends you its knack.' },
  slaying: { name: 'Slaying', icon: '🎯', type: 'combat', desc: 'Take bounties from the town boards and hunt down what they ask for. You hit harder and surer against your quarry.' },
  bardic: { name: 'Bardic Lore', icon: '🎻', type: 'combat', desc: 'Play for coin on the stages of inns. Every song leaves a mood behind it, on you and on your companions.' },
  medicine: { name: 'Medicine', icon: '🩺', type: 'combat', desc: 'Bandages, poultices and surgery. Every level makes food and potions heal you more, and the most skilled healers can mend a broken mind.' },
  necromancy: { name: 'Necromancy', icon: '💀', type: 'combat', desc: 'Raise thralls from bones in a ritual circle. They fight beside you until they crumble. The gods will not hear you while the dead walk with you.' },
});
SKILL_GROUPS.find(g => g.name === 'Gathering').skills.push('gardening', 'astronomy');
SKILL_GROUPS.find(g => g.name === 'Crafting').skills.push('jewelcrafting', 'tinkering', 'construction');
SKILL_GROUPS.find(g => g.name === 'Adventuring').skills.push('taming', 'slaying', 'bardic');
SKILL_GROUPS.find(g => g.name === 'Mind and Spirit').skills.push('medicine', 'necromancy');

Object.assign(STATIONS, {
  garden: { name: 'Garden Plots', icon: '🌱' },
  jeweller: { name: "Jeweller's Bench", icon: '💎', portable: 'jewellers_loupe' },
  stage: { name: 'Inn Stage', icon: '🎻' },
  observatory: { name: 'Observatory', icon: '🔭' },
});
LOCATIONS.hollowfen.stations.push('garden', 'stage');
LOCATIONS.ironhold.stations.push('jeweller', 'stage');
LOCATIONS.port_ulric.stations.push('jeweller', 'stage');
LOCATIONS.saltmire.stations.push('stage');
LOCATIONS.dunwich.stations.push('stage');
addItem('jewellers_loupe', { name: "Jeweller's Loupe", icon: '🔍', type: 'tool', sell: 150, desc: 'A lens and a set of fine tools: a jeweller\'s bench wherever you go.' });
addItem('lute', { name: 'Lute', icon: '🪕', type: 'tool', sell: 40, desc: 'Needed to perform on a stage.' });
addItem('stone_block', { name: 'Stone Block', icon: '🧱', sell: 4, desc: 'Squared and ready for building.' });
ACTIONS.mining.push({ id: 'quarry', name: 'Quarry Stone', level: 5, xp: 14, time: 3500, output: { stone_block: 1 } });
ACTIONS.mining.sort((a, b) => a.level - b.level);
LOCATIONS.ironhold.gather.mining.push('quarry');
LOCATIONS.deep_mines.gather.mining.push('quarry');
LOCATIONS.dunwich.gather.mining = ['quarry'];
ACTIONS.carpentry.push({ id: 'lute', name: 'Build a Lute', level: 12, xp: 60, time: 4500, station: 'workbench', input: { twisted_oak_logs: 3, iron_bar: 1 }, output: { lute: 1 } });
ACTIONS.carpentry.sort((a, b) => a.level - b.level);

// --- Gardening: plots that grow in real time ---
// seed: [crop, harvest, minutes to grow, Gardening level, xp on harvest]
const CROPS = {
  barley_seed: ['barley', 6, 2, 1, 8],
  hop_seed: ['hops', 4, 3, 5, 14],
  moss_spores: ['grave_moss', 5, 4, 8, 18],
  wort_seed: ['pale_wort', 4, 6, 14, 30],
  nightshade_seed: ['nightshade', 3, 10, 20, 50],
  poppy_seed: ['dream_poppy', 3, 15, 28, 80],
  myrtle_seed: ['bog_myrtle', 3, 20, 34, 110],
  star_rose_seed: ['star_rose', 2, 30, 42, 180],
};
const SEED_NAMES = { barley_seed: 'Barley Seed', hop_seed: 'Hop Seedlings', moss_spores: 'Grave-Moss Spores', wort_seed: 'Pale Wort Seed', nightshade_seed: 'Nightshade Seed', poppy_seed: 'Dream Poppy Seed', myrtle_seed: 'Bog Myrtle Cuttings', star_rose_seed: 'Star Rose Seed' };
for (const [id, [crop, , , level]] of Object.entries(CROPS)) {
  addItem(id, { name: SEED_NAMES[id], icon: '🌰', type: 'seed', sell: Math.max(1, Math.round(ITEMS[crop].sell / 2)), desc: `Plant it in a garden plot (Gardening ${level}) to grow ${ITEMS[crop].name}.` });
}
const GARDEN_BASE_PLOTS = 3;
const GARDEN_LEVELS_PER_PLOT = 10;
const MAX_PLOTS = 15;
const PLANT_XP_SHARE = 0.25;     // share of the harvest xp you get for planting
// Foraging now and then turns up seeds.
for (const [action, seed, chance] of [['grave_moss', 'moss_spores', 0.05], ['pale_wort', 'wort_seed', 0.04], ['nightshade', 'nightshade_seed', 0.03], ['dream_poppy', 'poppy_seed', 0.03], ['bog_myrtle', 'myrtle_seed', 0.03], ['star_rose', 'star_rose_seed', 0.02], ['wild_hops', 'hop_seed', 0.05]]) {
  const a = ACTIONS.foraging.find(x => x.id === action);
  a.bonus = (a.bonus || []).concat([{ item: seed, chance, qty: 1 }]);
}

// --- Astronomy ---
addItem('star_notes', { name: 'Star Notes', icon: '📝', sell: 4, desc: 'Positions, times and a sketch of something that should not have been there.' });
addItem('star_chart', { name: 'Star Chart', icon: '🗺️', sell: 60, desc: 'A chart of the heavens. Scholars and sailors pay well for one.' });
addItem('star_shard', { name: 'Star-Shard', icon: '💫', sell: 90, desc: 'A sliver of something that fell, still faintly warm. Jewellers and tinkers want it.' });
const ASTRONOMY_ELDRITCH_PER_LEVEL = 0.004;  // damage against eldritch beings per level
const ASTRONOMY_FORECAST_LEVEL = 10;          // from here you know when the stars will be right
const DAYLIGHT_SLOWDOWN = 2;                  // the sky is half as readable by day: activities take twice as long
ACTIONS.astronomy = [
  { id: 'stargaze', name: 'Stargaze', icon: '🌌', level: 1, xp: 12, time: 4000, anywhere: true, nightBest: true, output: { star_notes: 1 } },
  { id: 'constellations', name: 'Chart the Constellations', level: 8, xp: 40, time: 5000, nightBest: true, input: { star_notes: 3 }, output: { star_chart: 1 } },
  { id: 'comet', name: 'Follow the Comet\'s Fall', level: 18, xp: 70, time: 6000, nightBest: true, output: { star_shard: 1 } },
  { id: 'wandering_stars', name: 'Track the Wandering Stars', level: 28, xp: 100, time: 6500, nightBest: true, output: { star_chart: 2 }, bonus: [{ item: 'kadath_star', chance: 0.005, qty: 1 }] },
  { id: 'dark_star', name: 'Watch the Dark Star', level: 40, xp: 180, time: 8000, nightBest: true, sanityCost: 6, output: { eldritch_insight: 3, star_shard: 1 }, desc: 'From the gallery of the lamp that is not there, you can see a star that is not there either.' },
];
LOCATIONS.standing_stones.gather.astronomy = ['constellations', 'wandering_stars'];
LOCATIONS.port_ulric.gather.astronomy = ['constellations'];
LOCATIONS.crater.gather.astronomy = ['comet'];
LOCATIONS.lighthouse.gather.astronomy = ['dark_star'];

// --- Jewelcrafting: rings and pendants with modifiers ---
const JEWELS = [
  // [id, name, icon, slot, level, input, stats, mods, combat req, sell]
  ['seaglass_ring', 'Sea-Glass Ring', '💍', 'ring', 1, { sea_glass: 3, iron_bar: 1 }, { ward: 1 }, [['speed', 0.05, 'tidecombing']], 1, 30],
  ['amber_pendant', 'Amber Pendant', '📿', 'amulet', 10, { deep_amber: 1, silver_bar: 1 }, { ac: 1, ward: 1 }, [['gold', 0.05]], 8, 200],
  ['pearl_ring', 'Pearl Ring', '💍', 'ring', 18, { veil_pearl: 2, silver_bar: 1 }, { ward: 2 }, [['veil', 5], ['speed', 0.1, 'fishing']], 14, 400],
  ['ambergris_amulet', 'Ambergris Amulet', '📿', 'amulet', 26, { ambergris: 2, silver_bar: 2 }, { ac: 1, ward: 2 }, [['heal', 0.15], ['potency', 0.1]], 20, 700],
  ['onyx_ring', 'Onyx Ring of Leng', '💍', 'ring', 34, { leng_onyx: 2, starmetal_bar: 1 }, { hit: 1, ward: 3 }, [['eldritch', 0.08], ['sanityCost', -0.1, 'occultism']], 28, 1500],
  ['star_circlet', 'Star-Shard Circlet', '👑', 'head', 42, { star_shard: 3, starmetal_bar: 2 }, { ac: 3, ward: 3 }, [['allXp', 0.04]], 34, 3000],
  ['kadath_ring', 'Ring of Kadath', '💍', 'ring', 48, { kadath_star: 1, starmetal_bar: 2 }, { hit: 2, dmg: 2, ward: 4 }, [['speedAll', 0.05]], 40, 6000],
];
ACTIONS.jewelcrafting = [];
for (const [id, name, icon, slot, level, input, stats, mods, req, sell] of JEWELS) {
  addItem(id, { name, icon, type: 'equipment', slot, stats, mods, req: { combat: req }, sell, desc: 'Set by your own hand.' });
  ACTIONS.jewelcrafting.push({ id, name: `Set a ${name}`, level, xp: Math.round(sell / 3) + 10, time: 3500 + level * 80, station: 'jeweller', input, output: { [id]: 1 } });
}

// --- Tinkering: gadgets that help while carried ---
const GADGETS = [
  // [id, name, icon, level, input, mods, sell, desc]
  ['spring_trap', 'Spring Trap', '🪤', 1, { iron_bar: 2, ash_logs: 1 }, [['speed', 0.1, 'hunting']], 40, 'Snaps shut on anything that steps in it. Hunting goes faster.'],
  ['clockwork_lantern', 'Clockwork Lantern', '🏮', 10, { iron_bar: 2, silver_bar: 1 }, [['speed', 0.1, 'gravedigging'], ['speed', 0.1, 'archaeology']], 150, 'Winds itself and never gutters. Digging goes faster.'],
  ['chronometer', 'Pocket Chronometer', '⏱️', 20, { silver_bar: 2, blackiron_bar: 1 }, [['speedAll', 0.05]], 400, 'Keeps perfect time, which makes you keep better time.'],
  ['diving_bell', 'Brass Diving Bell', '🔔', 28, { adamantine_bar: 3, iron_bar: 4 }, [['speed', 0.15, 'tidecombing'], ['speed', 0.1, 'fishing']], 900, 'Folds down smaller than it should. You can stay under for an hour.'],
  ['migo_compass', 'Mi-Go Compass', '🧭', 36, { starmetal_bar: 2, eldritch_insight: 4 }, [['scout', 2], ['travel', 0.1], ['veil', 5]], 2000, 'Its needle points at whatever you are not seeing.'],
  ['aether_engine', 'Aether Engine', '⚙️', 45, { starmetal_bar: 3, star_shard: 4 }, [['speedAll', 0.08], ['travel', 0.15]], 6000, 'A humming box of star-metal gears. Everything around it hurries.'],
];
ACTIONS.tinkering = [];
for (const [id, name, icon, level, input, mods, sell, desc] of GADGETS) {
  addItem(id, { name, icon, type: 'tool', gadget: true, mods, sell, desc: `${desc} Works while carried.` });
  ACTIONS.tinkering.push({ id, name: `Build a ${name}`, level, xp: Math.round(sell / 3) + 12, time: 4000 + level * 100, station: 'workbench', input, output: { [id]: 1 } });
}

// --- Medicine ---
addItem('bandage', { name: 'Bandage', icon: '🩹', type: 'potion', heal: 25, sell: 4, desc: 'Restores 25 hitpoints.' });
addItem('poultice', { name: 'Herbal Poultice', icon: '🌿', type: 'potion', heal: 50, sanity: 5, sell: 12, desc: 'Restores 50 hitpoints and 5 sanity.' });
addItem('smelling_salts', { name: 'Smelling Salts', icon: '🧂', type: 'potion', sanity: 20, sell: 15, desc: 'Restores 20 sanity. Sharp enough to bring anyone back to themselves.' });
addItem('surgeons_kit', { name: "Surgeon's Kit", icon: '🧰', type: 'tool', gadget: true, mods: [['heal', 0.1], ['compHeal', 1]], sell: 300, desc: 'Knives, needles and gut. Food heals 10% more, and you patch up your companions in every fight. Works while carried.' });
const MEDICINE_HEAL_PER_LEVEL = 0.01;   // food and potions heal 1% more per level
const MEDICINE_RALLY_LEVEL = 20;        // from here downed companions get back up without an inn
ACTIONS.medicine = [
  { id: 'bandage', name: 'Roll Bandages', level: 1, xp: 8, time: 2500, anywhere: true, input: { linen: 1 }, output: { bandage: 2 } },
  { id: 'poultice', name: 'Mix a Poultice', level: 6, xp: 18, time: 3000, anywhere: true, input: { grave_moss: 2, pale_wort: 1 }, output: { poultice: 1 } },
  { id: 'smelling_salts', name: 'Prepare Smelling Salts', level: 12, xp: 28, time: 3500, station: 'lab', input: { sea_glass: 1, kelp: 2 }, output: { smelling_salts: 2 } },
  { id: 'tend', name: 'Tend Your Companions', icon: '🩺', level: 15, xp: 45, time: 4000, anywhere: true, input: { bandage: 2 }, effect: 'revive', output: {}, desc: 'Gets every downed companion back on their feet and heals them all.' },
  { id: 'surgeons_kit', name: "Assemble a Surgeon's Kit", level: 22, xp: 100, time: 5000, station: 'forge', input: { silver_bar: 2, linen: 2 }, output: { surgeons_kit: 1 } },
  { id: 'treat_mind', name: 'Treat a Broken Mind', icon: '🧠', level: 30, xp: 300, time: 15000, station: 'chapel', input: { calming_elixir: 3, clarity_draught: 1 }, effect: 'cure', output: {}, desc: 'Long talks, cold baths and a careful draught. You lose one step of madness and its newest derangement.' },
];

// --- Necromancy: thralls that fight for a while, then crumble ---
const THRALL_LEVELS_PER_SLOT = 25;       // one thrall, plus one more per this many levels
const THRALL_TIME_PER_LEVEL = 0.01;      // thralls last 1% longer per level
const NECROMANCY_KILL_SHARE = 0.3;       // share of each enemy's xp while a thrall fights with you
Object.assign(COMPANIONS, {
  skeleton_thrall: { name: 'Skeleton Thrall', icon: '💀', desc: 'Old bones, held together by your will.', hp: 40, ac: 13, hit: 4, dmg: '1d6+1', speed: 2600, wits: 99, mad: true, thrall: true, lasts: 600000, home: 'graveyard' },
  ghoul_thrall: { name: 'Ghoul Thrall', icon: '🧟', desc: 'A ghoul bound by its hunger. It heals by feeding on what falls.', hp: 70, ac: 13, hit: 6, dmg: '2d6', speed: 2800, wits: 99, mad: true, thrall: true, feeds: 5, lasts: 900000, home: 'graveyard' },
  bog_mummy: { name: 'Bog Mummy', icon: '🟤', desc: 'Raised from the peat, leathery and strong.', hp: 100, ac: 15, hit: 7, dmg: '2d6+2', speed: 2900, wits: 99, mad: true, thrall: true, lasts: 1200000, home: 'moonmere' },
  wight_thrall: { name: 'Wight Thrall', icon: '👻', desc: 'A barrow-king in your service. The things from beyond fear it a little.', hp: 140, ac: 16, hit: 9, dmg: '2d8+2', speed: 2600, wits: 99, mad: true, thrall: true, lasts: 1500000, home: 'standing_stones', mods: [['eldritch', 0.1]] },
});
ACTIONS.necromancy = [
  { id: 'skeleton_thrall', name: 'Raise a Skeleton', icon: '💀', level: 1, xp: 20, time: 5000, station: 'circle', sanityCost: 4, input: { old_bones: 5 }, effect: 'raise', output: {} },
  { id: 'ghoul_thrall', name: 'Bind a Ghoul', icon: '🧟', level: 15, xp: 70, time: 6000, station: 'circle', sanityCost: 6, input: { old_bones: 8, grave_goods: 2 }, effect: 'raise', output: {} },
  { id: 'bog_mummy', name: 'Raise a Bog Mummy', icon: '🟤', level: 28, xp: 140, time: 7000, station: 'circle', sanityCost: 8, input: { grave_goods: 3, bog_myrtle: 2 }, effect: 'raise', output: {} },
  { id: 'wight_thrall', name: 'Call Up a Barrow-King', icon: '👻', level: 42, xp: 260, time: 9000, station: 'circle', sanityCost: 12, input: { ancient_bones: 1, eldritch_insight: 3 }, effect: 'raise', output: {} },
];

// --- Bardic Lore: songs on inn stages ---
ACTIONS.bardic = [
  { id: 'shanty', name: 'Sing a Sea Shanty', icon: '🎶', level: 1, xp: 11, time: 3500, station: 'stage', needs: ['lute'], gold: [2, 7], output: {} },
  { id: 'ballad', name: 'The Ballad of the Fallen Star', icon: '☄️', level: 8, xp: 26, time: 4000, station: 'stage', needs: ['lute'], gold: [6, 14], output: {}, buff: { name: 'Inspired', icon: '🎵', effects: { compHit: 1, compDmg: 1 }, ms: 600000 } },
  { id: 'lullaby', name: 'The Lullaby of Ulthar', icon: '🐈', level: 16, xp: 45, time: 4500, station: 'stage', needs: ['lute'], gold: [5, 12], sanityGain: 3, output: {}, buff: { name: 'Soothed', icon: '🐈', effects: { ward: 1 }, ms: 600000 } },
  { id: 'warsong', name: 'The War-Song of Ironhold', icon: '⚒️', level: 26, xp: 80, time: 5000, station: 'stage', needs: ['lute'], gold: [12, 26], output: {}, buff: { name: 'War-Song', icon: '⚒️', effects: { dmg: 2, hit: 1 }, ms: 600000 } },
  { id: 'dirge', name: 'A Dirge for the Drowned', icon: '🌊', level: 34, xp: 120, time: 5500, station: 'stage', needs: ['lute'], gold: [10, 30], output: {}, buff: { name: 'Dirge', icon: '🌊', effects: { eldritch: 0.15, killHeal: 3 }, ms: 600000 } },
  { id: 'unsong', name: 'The Song That Is Not', icon: '🎭', level: 44, xp: 220, time: 6500, station: 'stage', needs: ['lute'], sanityCost: 6, gold: [30, 70], output: {}, buff: { name: 'The Song That Is Not', icon: '🎭', effects: { allXp: 0.1, eldritch: 0.2 }, ms: 600000 }, desc: 'The audience applauds. Some of the audience was not there before.' },
];

// --- Beast Taming: one pet at a time ---
const PETS = {
  fox: { name: 'Blackwood Fox', icon: '🦊', desc: 'Quick and curious. It finds herbs before you do.', mods: [['speed', 0.1, 'foraging'], ['speed', 0.1, 'woodcutting']] },
  raven: { name: 'Graveyard Raven', icon: '🐦‍⬛', desc: 'It flies ahead and tells you what it saw, in its way.', mods: [['scout', 1], ['speed', 0.1, 'gravedigging']] },
  heron: { name: 'Marsh Heron', icon: '🪶', desc: 'It stands beside you at the water and never misses a fish.', mods: [['speed', 0.15, 'fishing'], ['double', 0.05, 'fishing']] },
  ulthar_cat: { name: 'Cat of Ulthar', icon: '🐈', desc: 'A cat from the Dreamlands that chose you. Nightmares keep away from it.', mods: [['ward', 2], ['dreamRest', 1, 'dreaming']] },
  hatchling: { name: 'Deep-One Hatchling', icon: '🐸', desc: 'It croaks happily in your pack. Things from the deep treat you as kin.', mods: [['eldritch', 0.1], ['speed', 0.15, 'tidecombing']] },
  gaunt_fledgling: { name: 'Nightgaunt Fledgling', icon: '🦇', desc: 'Faceless, silent, and fond of you. It carries you faster along the roads.', mods: [['travel', 0.2], ['sneak', 1]] },
};
const TAME_BASE_CHANCE = 0.2;
const TAME_CHANCE_PER_LEVEL = 0.005;
ACTIONS.taming = [
  { id: 'fox', name: 'Coax a Fox', icon: '🦊', level: 1, xp: 12, time: 4000, input: { bread: 2 }, effect: 'tame', output: {} },
  { id: 'raven', name: 'Befriend a Raven', icon: '🐦‍⬛', level: 10, xp: 30, time: 4500, input: { bread: 3 }, effect: 'tame', output: {} },
  { id: 'heron', name: 'Win Over a Heron', icon: '🪶', level: 18, xp: 50, time: 5000, input: { raw_shrimp: 3 }, effect: 'tame', output: {} },
  { id: 'ulthar_cat', name: 'Court a Cat of Ulthar', icon: '🐈', level: 25, xp: 80, time: 5500, station: 'bed', input: { raw_deep_cod: 2, cat_whisker: 1 }, effect: 'tame', output: {}, desc: 'In a dream, on the steps of Ulthar. It decides, not you.' },
  { id: 'hatchling', name: 'Hatch a Deep-One Egg', icon: '🐸', level: 35, xp: 130, time: 6500, minMadness: 1, input: { deep_egg: 3, raw_squidling: 2 }, effect: 'tame', output: {} },
  { id: 'gaunt_fledgling', name: 'Charm a Nightgaunt Fledgling', icon: '🦇', level: 45, xp: 220, time: 8000, minMadness: 2, input: { dream_honey: 2 }, effect: 'tame', output: {} },
];
LOCATIONS.blackwood.gather.taming = ['fox'];
LOCATIONS.graveyard.gather.taming = ['raven'];
LOCATIONS.moonmere.gather.taming = ['heron'];
LOCATIONS.devils_reef.gather.taming = ['hatchling'];
LOCATIONS.dreaming_grove.gather.taming = ['gaunt_fledgling'];

// --- Slaying: bounties from the town boards ---
const SLAYER_KILL_SHARE = 0.5;     // Slaying xp per kill of your quarry, as a share of its xp
const SLAYER_REWARD_GOLD = 0.4;    // gold per kill when the bounty is done, as a share of the quarry's xp
const SLAYER_REWARD_XP = 0.5;
const SLAYER_REROLL_GOLD = 50;
const SLAYER_HIT_LEVELS = 10;      // +1 to hit against your quarry per this many levels
const SLAYER_DMG_LEVELS = 5;       // +1 damage against your quarry per this many levels

// --- Construction: odd jobs, then a house of your own ---
ACTIONS.construction = [
  { id: 'repair_cottages', name: 'Repair Fishermen\'s Cottages', icon: '🔨', level: 1, xp: 15, time: 4000, input: { ash_logs: 4 }, gold: [6, 14], output: {} },
  { id: 'shore_tunnels', name: 'Shore Up the Mine Tunnels', icon: '⛏️', level: 12, xp: 40, time: 5000, input: { stone_block: 4 }, gold: [18, 36], output: {} },
  { id: 'raise_stilts', name: 'Raise New Stilt-Houses', icon: '🛖', level: 22, xp: 70, time: 5500, input: { grave_pine_logs: 4 }, gold: [25, 50], output: {} },
  { id: 'rebuild_barn', name: 'Rebuild a Dunwich Barn', icon: '🏚️', level: 32, xp: 120, time: 6500, input: { shadowbark_logs: 4, stone_block: 4 }, gold: [40, 80], output: {} },
  { id: 'abbey_spire', name: 'Mend the Abbey Spire', icon: '⛪', level: 42, xp: 200, time: 7500, input: { pale_logs: 4, stone_block: 6 }, gold: [60, 120], output: {} },
];
LOCATIONS.saltmire.gather.construction = ['repair_cottages'];
LOCATIONS.ironhold.gather.construction = ['shore_tunnels'];
LOCATIONS.hollowfen.gather.construction = ['raise_stilts'];
LOCATIONS.dunwich.gather.construction = ['rebuild_barn'];
LOCATIONS.silent_abbey.gather.construction = ['abbey_spire'];
// Rooms: built once, in the town where your house stands.
const HOUSE_ROOMS = {
  house: { name: 'A House of Your Own', icon: '🏠', level: 1, xp: 150, goldCost: 500, input: { ash_logs: 10, stone_block: 5 }, stations: ['fire'], mods: [], desc: 'Buy a plot in this town and build on it. Your house can only stand in one town.' },
  bedroom: { name: 'Bedroom', icon: '🛏️', level: 5, xp: 200, input: { twisted_oak_logs: 8, linen: 4 }, stations: ['bed'], mods: [['hp', 10]], desc: 'A bed of your own: you can dream at home, and you are hardier for the sleep.' },
  storeroom: { name: 'Strongroom', icon: '🏦', level: 10, xp: 300, input: { grave_pine_logs: 8, iron_bar: 4, stone_block: 6 }, stations: [], bank: true, mods: [['carry', 2]], desc: 'A vault joined to the banks of Aldmark, and racks that let you pack better.' },
  garden: { name: 'Kitchen Garden', icon: '🌱', level: 15, xp: 400, input: { twisted_oak_logs: 6, stone_block: 8 }, stations: ['garden'], mods: [['plots', 2], ['heal', 0.1]], desc: 'Garden plots at home, two more plots to sow, and fresh greens with every meal.' },
  workshop: { name: 'Workshop', icon: '🛠️', level: 20, xp: 600, input: { grave_pine_logs: 10, iron_bar: 8, stone_block: 10 }, stations: ['forge', 'workbench', 'loom', 'tannery', 'jeweller'], mods: [['speed', 0.05, 'smithing'], ['speed', 0.05, 'carpentry'], ['speed', 0.05, 'tailoring']], desc: 'A forge, a workbench, a loom, a tannery and a jeweller\'s bench under one roof.' },
  library: { name: 'Library', icon: '📚', level: 28, xp: 900, input: { shadowbark_logs: 10, parchment: 20 }, stations: ['library', 'desk'], mods: [['xp', 0.1, 'lore'], ['xp', 0.1, 'inscription']], desc: 'Shelves for the books you should not own, and a desk to copy them at.' },
  shrine: { name: 'Private Shrine', icon: '🕯️', level: 34, xp: 1200, input: { pale_logs: 8, silver_bar: 6, stone_block: 12 }, stations: ['chapel', 'circle'], mods: [['ward', 1]], desc: 'A chapel on one side and a chalk circle on the other. Nobody needs to know which you use.' },
  music_room: { name: 'Music Room', icon: '🎻', level: 38, xp: 1400, input: { shadowbark_logs: 8, linen: 10 }, stations: ['stage'], mods: [['buffTime', 0.1]], desc: 'Play for your own guests. Moods linger longer here.' },
  trophy_hall: { name: 'Trophy Hall', icon: '🦌', level: 42, xp: 1800, input: { adamantine_bar: 5, pale_logs: 10, stone_block: 15 }, stations: [], mods: [['dmg', 1], ['gold', 0.05]], desc: 'Heads on the walls remind you, and your visitors, what you are capable of.' },
  observatory: { name: 'Observatory', icon: '🔭', level: 48, xp: 2500, input: { starmetal_bar: 5, dream_logs: 5, stone_block: 20 }, stations: ['observatory'], mods: [['allXp', 0.03], ['speed', 0.2, 'astronomy'], ['eldritch', 0.05]], desc: 'A brass telescope under a dome that opens on the stars.' },
};
for (const [id, r] of Object.entries(HOUSE_ROOMS)) {
  ACTIONS.construction.push({ id: `build_${id}`, name: id === 'house' ? 'Build Your House' : `Build a ${r.name}`, icon: r.icon, level: r.level, xp: r.xp, time: 8000 + r.level * 150, anywhere: true, goldCost: r.goldCost, input: r.input, effect: 'build', room: id, output: {}, desc: r.desc });
}
ACTIONS.construction.sort((a, b) => a.level - b.level);

// --- Shops ---
SHOPS.fen_store.stock.push({ item: 'barley_seed', price: 2 }, { item: 'hop_seed', price: 4 }, { item: 'moss_spores', price: 5 }, { item: 'wort_seed', price: 12 }, { item: 'linen', price: 8 });
SHOPS.general_store.stock.push({ item: 'barley_seed', price: 3 }, { item: 'hop_seed', price: 5 }, { item: 'lute', price: 120 }, { item: 'bandage', price: 10 });
SHOPS.apothecary.stock.push({ item: 'wort_seed', price: 15 }, { item: 'nightshade_seed', price: 30 }, { item: 'bandage', price: 8 }, { item: 'smelling_salts', price: 40 });
SHOPS.smithy.stock.push({ item: 'jewellers_loupe', price: 600 }, { item: 'stone_block', price: 10 });
SHOPS.ulric_bazaar.stock.push({ item: 'poppy_seed', price: 80 }, { item: 'myrtle_seed', price: 120 }, { item: 'lute', price: 100 }, { item: 'jewellers_loupe', price: 500 });
SHOPS.hollow_market.stock.push({ item: 'poppy_seed', price: 3 }, { item: 'star_rose_seed', price: 12 });
SHOPS.esoteric_order.stock.push({ item: 'star_rose_seed', price: 600 });
SHOPS.osborn_store.stock.push({ item: 'stone_block', price: 9 }, { item: 'barley_seed', price: 3 });

// --- Achievements ---
ACHIEVEMENTS.push(
  { id: 'homeowner', icon: '🏠', name: 'Homeowner', desc: 'Build a house of your own.', test: g => !!(g.state.house && g.state.house.rooms.house) },
  { id: 'green_thumb', icon: '🌹', name: 'Green Thumb', desc: 'Harvest a Star Rose from your garden.', test: g => !!g.state.flags.starRoseHarvest },
  { id: 'menagerie', icon: '🐾', name: 'Menagerie', desc: 'Tame every beast in Aldmark.', test: g => Object.keys(PETS).every(p => g.state.pets.owned[p]) },
  { id: 'bounty_hunter', icon: '🎯', name: 'Bounty Hunter', desc: 'Complete 20 bounties.', test: g => g.state.slayer.done >= 20 },
  { id: 'mind_mended', icon: '🩺', name: 'Physician, Heal Thyself', desc: 'Treat your own broken mind.', test: g => !!g.state.flags.mindMended },
);
